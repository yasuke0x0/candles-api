import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import User from '#models/user'
import Coupon from '#models/coupon' //
import InventoryService from '#services/inventory_service'
import AddressService from '#services/address_service'
import HttpException from '#exceptions/http_exception'

export default class OrderService {
  private inventoryService = new InventoryService()
  private addressService = new AddressService()

  // Constants
  private readonly SHIPPING_COST = 15.0
  private readonly DEFAULT_VAT_RATE = 20.0

  public async createOrder(user: User, payload: any, expectedAmountInCents?: number) {
    // 1. Extract couponCode from payload
    const { items, shippingAddress, billingAddress, paymentIntentId, couponCode } = payload

    const trx = await db.transaction()

    try {
      // 2. Resolve Addresses
      const shippingAddr = await this.addressService.findOrCreateAddress(
        user,
        shippingAddress,
        'SHIPPING',
        trx
      )

      const billingAddr = await this.addressService.findOrCreateAddress(
        user,
        billingAddress,
        'BILLING',
        trx
      )

      // 3. Initialize Order (Status created)
      const order = await Order.create(
        {
          userId: user.id,
          shippingAddressId: shippingAddr.id,
          billingAddressId: billingAddr.id,
          paymentIntentId,
          status: 'created',
          totalAmount: 0,
          amountWithoutVat: 0,
          vatAmount: 0,
          shippingAmount: this.SHIPPING_COST,
          totalDiscount: 0,
          couponId: null, // Initialize
          couponDiscountAmount: 0, // Initialize
        },
        { client: trx }
      )

      let orderTotalGross = 0
      let orderTotalNet = 0
      let orderTotalVat = 0
      let orderTotalProductDiscount = 0

      const orderItemsToCreate = []

      // 4. Process Items
      for (const item of items) {
        // A. Decrement Stock
        const product = await this.inventoryService.adjustStock(item.id, -item.quantity, 'SALE', {
          userId: user.id,
          orderId: order.id,
          trx: trx,
        })

        // B. Load Product Discounts
        await product.useTransaction(trx).load('discounts')

        // C. Calculate Line Prices
        const unitPriceBase = Number(product.price)
        const unitPriceFinal = product.currentPrice // Includes Product-level discounts

        // Calculate Product Discount
        const discountPerUnit = unitPriceBase - unitPriceFinal
        const totalDiscountForLine = discountPerUnit * item.quantity

        // Find description
        let discountDescription = null
        if (discountPerUnit > 0) {
          const activeDiscount = product.discounts.find((d) => d.isActive)
          if (activeDiscount) {
            discountDescription = activeDiscount.name
          }
        }

        // VAT Calculations
        const vatRate = product.vatRate || this.DEFAULT_VAT_RATE
        const unitPriceNet = unitPriceFinal / (1 + vatRate / 100)

        // Line Totals
        const lineTotalGross = unitPriceFinal * item.quantity
        const lineTotalNet = unitPriceNet * item.quantity
        const lineVatAmount = lineTotalGross - lineTotalNet

        // Accumulate
        orderTotalGross += lineTotalGross
        orderTotalNet += lineTotalNet
        orderTotalVat += lineVatAmount
        orderTotalProductDiscount += totalDiscountForLine

        // D. Snapshot Data
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: unitPriceBase,
          priceNet: unitPriceNet,
          vatRate: vatRate,
          vatAmount: lineVatAmount,
          totalPrice: lineTotalGross,
          discountAmount: totalDiscountForLine,
          discountDescription: discountDescription,
        })
      }

      // 5. Handle Coupon Logic (New)
      let couponDiscount = 0
      let activeCoupon: Coupon | null = null

      if (couponCode) {
        // Find Coupon
        activeCoupon = await Coupon.findBy('code', couponCode, { client: trx })

        if (!activeCoupon) {
          throw new HttpException({
            message: `Coupon '${couponCode}' is invalid or expired.`,
            status: 400,
          })
        }

        // Validate (Pass the calculated subtotal)
        //
        const validation = await activeCoupon.isValidFor(user.id, orderTotalGross)

        if (!validation.valid) {
          throw new HttpException({
            message: `Coupon invalid: ${validation.reason}`,
            status: 400,
          })
        }

        // Calculate Discount
        couponDiscount = activeCoupon.calculateDiscount(orderTotalGross)

        // Increment Usage
        activeCoupon.currentUses += 1
        await activeCoupon.useTransaction(trx).save()
      }

      // 6. Final Totals Calculation
      const subtotal = orderTotalGross
      const finalTotal = subtotal - couponDiscount + this.SHIPPING_COST

      // Ensure total doesn't go below zero
      const safeFinalTotal = Math.max(0, finalTotal)

      // 7. Security Check (Compare with PaymentIntent amount)
      if (expectedAmountInCents !== undefined) {
        const calculatedInCents = Math.round(safeFinalTotal * 100)
        // Allow a 1-cent variance due to floating point math, or strict check
        if (Math.abs(calculatedInCents - expectedAmountInCents) > 1) {
          throw new HttpException({
            message: `Security Mismatch: Calculated total ($${safeFinalTotal.toFixed(2)}) does not match payment ($${(expectedAmountInCents / 100).toFixed(2)}).`,
            status: 400, // Changed to 400 as this is likely a client/hack error
          })
        }
      }

      // 8. Save Items
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      // 9. Update Order Record
      order.totalAmount = safeFinalTotal
      order.amountWithoutVat = orderTotalNet // Note: This is net of product discounts, not coupon
      order.vatAmount = orderTotalVat // Note: VAT based on line items

      // Store Discount Details
      order.couponId = activeCoupon ? activeCoupon.id : null
      order.couponDiscountAmount = couponDiscount
      order.totalDiscount = orderTotalProductDiscount + couponDiscount // Combine both

      await order.useTransaction(trx).save()

      await trx.commit()

      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
