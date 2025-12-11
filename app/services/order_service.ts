import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import User from '#models/user'
import Coupon from '#models/coupon'
import InventoryService from '#services/inventory_service'
import AddressService from '#services/address_service'
import ShippoService from '#services/shippo_service' // 1. Import Shippo
import HttpException from '#exceptions/http_exception'

export default class OrderService {
  private inventoryService = new InventoryService()
  private addressService = new AddressService()
  private shippoService = new ShippoService()

  public async createOrder(user: User, payload: any, expectedAmountInCents?: number) {
    const { items, shippingAddress, billingAddress, paymentIntentId, couponCode } = payload

    // Calculate Dynamic Shipping Cost
    let shippingCost = 0
    try {
      // Construct the address object as expected by ShippoService
      const addressForShippo = {
        ...shippingAddress,
        email: user.email, // Add email from user account
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      }

      // Fetch rate
      const rateData = await this.shippoService.getShippingRate(addressForShippo, items)
      shippingCost = rateData.cost
    } catch (error) {
      console.error('Shipping calculation failed during order creation', error)
      throw new HttpException({
        message: 'Unable to calculate shipping rates. Please verify your address.',
        status: 400,
      })
    }

    const trx = await db.transaction()

    try {
      // 4. Resolve Addresses
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

      // 5. Initialize Order
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
          shippingAmount: shippingCost, // Use the calculated dynamic cost
          totalDiscount: 0,
          couponId: null,
          couponDiscountAmount: 0,
        },
        { client: trx }
      )

      let orderTotalGross = 0
      let orderTotalNet = 0
      let orderTotalVat = 0
      let orderTotalProductDiscount = 0

      const orderItemsToCreate = []

      // 6. Process Items
      for (const item of items) {
        // A. Decrement Stock
        const product = await this.inventoryService.adjustStock(item.id, -item.quantity, 'SALE', {
          userId: user.id,
          orderId: order.id,
          trx: trx,
        })

        // B. Load Product Discount (Singular)
        await product.useTransaction(trx).load('discount')

        // C. Calculate Line Prices
        const unitPriceBase = Number(product.price)
        const unitPriceFinal = product.currentPrice

        // Calculate Product Discount
        const discountPerUnit = unitPriceBase - unitPriceFinal
        const totalDiscountForLine = discountPerUnit * item.quantity

        // Find description
        let discountDescription = null
        if (discountPerUnit > 0 && product.discount) {
          discountDescription = product.discount.name
        }

        // D. VAT Calculations (Dynamic from Product DB)
        const vatRate = Number(product.vatRate) // Uses product's specific VAT rate
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

        // E. Snapshot Data
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: unitPriceBase,
          priceNet: unitPriceNet,
          vatRate: vatRate, // Store the specific rate used
          vatAmount: lineVatAmount,
          totalPrice: lineTotalGross,
          discountAmount: totalDiscountForLine,
          discountDescription: discountDescription,
        })
      }

      // 7. Handle Coupon Logic
      let couponDiscount = 0
      let activeCoupon: Coupon | null = null

      if (couponCode) {
        activeCoupon = await Coupon.findBy('code', couponCode, { client: trx })

        if (!activeCoupon) {
          throw new HttpException({
            message: `Coupon '${couponCode}' is invalid or expired.`,
            status: 400,
          })
        }

        const validation = await activeCoupon.isValidFor(user.id, orderTotalGross)

        if (!validation.valid) {
          throw new HttpException({
            message: `Coupon invalid: ${validation.reason}`,
            status: 400,
          })
        }

        couponDiscount = activeCoupon.calculateDiscount(orderTotalGross)

        activeCoupon.currentUses += 1
        await activeCoupon.useTransaction(trx).save()
      }

      // 8. Final Totals Calculation
      const subtotal = orderTotalGross
      const finalTotal = subtotal - couponDiscount + shippingCost // Add dynamic shipping

      const safeFinalTotal = Math.max(0, finalTotal)

      // 9. Security Check (Verify against Stripe Payment)
      if (expectedAmountInCents !== undefined) {
        const calculatedInCents = Math.round(safeFinalTotal * 100)
        // Allow a 1-cent variance due to floating point math
        if (Math.abs(calculatedInCents - expectedAmountInCents) > 1) {
          const message = `Security Mismatch: Calculated total ($${safeFinalTotal.toFixed(2)}) does not match payment ($${(expectedAmountInCents / 100).toFixed(2)}).`
          console.error(message)
          throw new HttpException({
            message,
            status: 400,
          })
        }
      }

      // 10. Save Items & Update Order
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      order.totalAmount = safeFinalTotal
      order.amountWithoutVat = orderTotalNet
      order.vatAmount = orderTotalVat

      order.couponId = activeCoupon ? activeCoupon.id : null
      order.couponDiscountAmount = couponDiscount
      order.totalDiscount = orderTotalProductDiscount + couponDiscount

      await order.useTransaction(trx).save()

      await trx.commit()

      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
