import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import User from '#models/user'
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
    const { items, shippingAddress, billingAddress, paymentIntentId } = payload

    const trx = await db.transaction()

    try {
      // 1. Resolve Addresses
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

      // 2. Initialize Order
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
        },
        { client: trx }
      )

      let orderTotalGross = 0
      let orderTotalNet = 0
      let orderTotalVat = 0
      let orderTotalDiscount = 0

      const orderItemsToCreate = []

      // 3. Process Items
      for (const item of items) {
        // A. Decrement Stock
        const product = await this.inventoryService.adjustStock(item.id, -item.quantity, 'SALE', {
          userId: user.id,
          orderId: order.id,
          trx: trx,
        })

        // IMPORTANT: Load discounts to ensure 'currentPrice' computed property works
        await product.useTransaction(trx).load('discounts')

        // B. Calculate Prices
        const unitPriceBase = Number(product.price) // The original price (e.g. 30.00)
        const unitPriceFinal = product.currentPrice // The discounted price (e.g. 25.00)

        // Calculate Discount
        const discountPerUnit = unitPriceBase - unitPriceFinal
        const totalDiscountForLine = discountPerUnit * item.quantity

        // Find description (e.g. "Summer Sale")
        // We reuse the logic from the model to find the *active* discount
        // (In a real app, you might make a helper method on the model to return the Discount object directly)
        let discountDescription = null
        if (discountPerUnit > 0) {
          const activeDiscount = product.discounts.find((d) => d.isActive) // Simplified check
          if (activeDiscount) {
            discountDescription = activeDiscount.name
          }
        }

        // VAT Calculations (Based on the FINAL discounted price)
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
        orderTotalDiscount += totalDiscountForLine

        // C. Snapshot Data
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,

          // Pricing
          price: unitPriceBase, // Original Price
          priceNet: unitPriceNet, // Net of the Final Price
          vatRate: vatRate,
          vatAmount: lineVatAmount,
          totalPrice: lineTotalGross, // What they actually paid

          // Discount Snapshot
          discountAmount: totalDiscountForLine,
          discountDescription: discountDescription,
        })
      }

      // 4. Final Totals
      orderTotalGross += this.SHIPPING_COST

      // 5. Security Check
      if (expectedAmountInCents !== undefined) {
        const calculatedInCents = Math.round(orderTotalGross * 100)
        if (calculatedInCents !== expectedAmountInCents) {
          throw new HttpException({
            message: `Security Mismatch: Calculated total ($${orderTotalGross.toFixed(2)}) does not match payment ($${(expectedAmountInCents / 100).toFixed(2)}).`,
            status: 500,
          })
        }
      }

      // 6. Save Items
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      // 7. Update Order
      order.totalAmount = orderTotalGross
      order.amountWithoutVat = orderTotalNet
      order.vatAmount = orderTotalVat
      order.totalDiscount = orderTotalDiscount // Save total discount

      await order.useTransaction(trx).save()

      await trx.commit()

      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
