import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import User from '#models/user'
import InventoryService from '#services/inventory_service'
import AddressService from '#services/address_service'

export default class OrderService {
  private inventoryService = new InventoryService()
  private addressService = new AddressService()
  private readonly SHIPPING_COST = 15.0

  /**
   * Creates an order, decrements stock, and ensures data integrity.
   * @param user
   * @param payload
   * @param expectedAmountInCents - The amount captured by Stripe (for security verification)
   */
  public async createOrder(user: User, payload: any, expectedAmountInCents?: number) {
    const { items, shippingAddress, billingAddress, paymentIntentId } = payload

    // 1. Start a Database Transaction
    // Everything below happens in "All or Nothing" mode.
    const trx = await db.transaction()

    try {
      // 1. Resolve Addresses (Find or Create)
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

      // 2. Create the Order Shell first
      const order = await Order.create(
        {
          userId: user.id,
          shippingAddressId: shippingAddr.id,
          billingAddressId: billingAddr.id,
          paymentIntentId,
          status: 'created', // The status is initialized as created and then modified through webhook
          totalAmount: 0,
        },
        { client: trx }
      )

      let calculatedTotal = 0
      const orderItemsToCreate = []

      // 3. Process Items & Manage Stock
      for (const item of items) {
        // A. Decrement Stock using InventoryService
        const product = await this.inventoryService.adjustStock(
          item.id,
          -item.quantity, // Negative quantity for sales
          'SALE',
          {
            userId: user.id,
            orderId: order.id,
            trx: trx, // IMPORTANT: Must use the same transaction
          }
        )

        // B. Calculate Price based on DB data (Security best practice)
        // Ensure we cast to number as DB decimals might be strings
        const unitPrice = Number(product.price)
        const lineTotal = unitPrice * item.quantity
        calculatedTotal += lineTotal

        // C. Prepare OrderItem data
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name, // Snapshot name
          price: unitPrice, // Snapshot price
          quantity: item.quantity,
        })
      }

      // 4. Add Shipping
      calculatedTotal += this.SHIPPING_COST

      // 5. SECURITY CHECK: Compare DB Total vs Stripe Total
      if (expectedAmountInCents !== undefined) {
        // Convert our float total to cents (e.g. 155.00 -> 15500)
        const calculatedInCents = Math.round(calculatedTotal * 100)

        if (calculatedInCents !== expectedAmountInCents) {
          throw new Error(
            `Security Mismatch: Cart total ($${calculatedTotal}) does not match paid amount.`
          )
        }
      }

      // 6. Save all Order Items
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      // 7. Update Order Total
      order.totalAmount = calculatedTotal
      await order.useTransaction(trx).save()

      // 8. Commit Transaction
      await trx.commit()

      return order
    } catch (error) {
      // 9. Rollback on any error (Out of stock, Price mismatch, etc.)
      await trx.rollback()
      throw error
    }
  }
}
