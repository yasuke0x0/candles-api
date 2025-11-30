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

  /**
   * Creates an order, decrements stock, and ensures data integrity.
   * @param user
   * @param payload
   * @param expectedAmountInCents - The amount captured by Stripe (for security verification)
   */
  public async createOrder(user: User, payload: any, expectedAmountInCents?: number) {
    const { items, shippingAddress, billingAddress, paymentIntentId } = payload

    // 1. Start a Database Transaction
    const trx = await db.transaction()

    try {
      // 2. Resolve Addresses (Find or Create)
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

      // 3. Initialize Order Shell
      // We set initial values here, they will be updated after processing items
      const order = await Order.create(
        {
          userId: user.id,
          shippingAddressId: shippingAddr.id,
          billingAddressId: billingAddr.id,
          paymentIntentId,
          status: 'created',

          // Initialize Financials
          totalAmount: 0,
          amountWithoutVat: 0,
          vatAmount: 0,
          shippingAmount: this.SHIPPING_COST,
        },
        { client: trx }
      )

      // Accumulators
      let orderTotalGross = 0
      let orderTotalNet = 0
      let orderTotalVat = 0

      const orderItemsToCreate = []

      // 4. Process Items & Manage Stock
      for (const item of items) {
        // A. Decrement Stock
        const product = await this.inventoryService.adjustStock(item.id, -item.quantity, 'SALE', {
          userId: user.id,
          orderId: order.id,
          trx: trx,
        })

        // B. Financial Calculations
        // We assume product.price is the PUBLIC GROSS price (inclusive of VAT)
        const vatRate = product.vatRate || this.DEFAULT_VAT_RATE
        const unitPriceGross = Number(product.price)

        // Calculate Net: Gross / (1 + Rate/100)
        // Example: 30.00 / 1.20 = 25.00
        const unitPriceNet = unitPriceGross / (1 + vatRate / 100)

        // Line Totals
        const lineTotalGross = unitPriceGross * item.quantity
        const lineTotalNet = unitPriceNet * item.quantity
        const lineVatAmount = lineTotalGross - lineTotalNet

        // Accumulate Order Totals
        orderTotalGross += lineTotalGross
        orderTotalNet += lineTotalNet
        orderTotalVat += lineVatAmount

        // C. Prepare OrderItem data (Snapshot everything)
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,

          // Detailed Pricing
          price: unitPriceGross, // Unit Gross
          priceNet: unitPriceNet, // Unit Net
          vatRate: vatRate, // VAT % applied
          vatAmount: lineVatAmount, // Total VAT for this line
          totalPrice: lineTotalGross, // Total Gross for this line
        })
      }

      // 5. Add Shipping to Final Total
      // Note: We handle shipping as a flat gross fee here.
      // If you need tax on shipping, calculate it here.
      orderTotalGross += this.SHIPPING_COST

      // 6. SECURITY CHECK: Compare DB Total vs Stripe Total
      if (expectedAmountInCents !== undefined) {
        const calculatedInCents = Math.round(orderTotalGross * 100)

        if (calculatedInCents !== expectedAmountInCents) {
          throw new HttpException({
            message: `Security Mismatch: Cart total ($${orderTotalGross.toFixed(2)}) does not match paid amount.`,
            status: 400,
          })
        }
      }

      // 7. Save all Order Items
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      // 8. Update Order Totals
      order.totalAmount = orderTotalGross
      order.amountWithoutVat = orderTotalNet
      order.vatAmount = orderTotalVat

      await order.useTransaction(trx).save()

      // 9. Commit Transaction
      await trx.commit()

      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
