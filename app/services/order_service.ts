import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import User from '#models/user'
import InventoryService from '#services/inventory_service'

export default class OrderService {
  private inventoryService = new InventoryService()

  /**
   * Creates an order, decrements stock, and ensures data integrity.
   */
  public async createOrder(user: User, payload: any) {
    const { items, shippingAddress, billingAddress, paymentIntentId } = payload

    // 1. Start a Database Transaction
    // Everything below happens in "All or Nothing" mode.
    const trx = await db.transaction()

    try {
      // 2. Create the Order Shell first
      // We set totalAmount to 0 initially, then update it after calculating items
      const order = await Order.create(
        {
          userId: user.id,
          shippingAddress,
          billingAddress,
          paymentIntentId,
          status: 'paid', // Or 'pending' if waiting for webhook
          totalAmount: 0,
        },
        { client: trx }
      )

      let calculatedTotal = 0
      const orderItemsToCreate = []

      // 3. Process Items & Manage Stock
      for (const item of items) {
        // A. Decrement Stock using InventoryService
        // This locks the product row, ensures availability, and logs the movement.
        // We pass the order.id so the movement is linked to this specific order.
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
        const lineTotal = product.price * item.quantity
        calculatedTotal += lineTotal

        // C. Prepare OrderItem data
        orderItemsToCreate.push({
          orderId: order.id,
          productId: product.id,
          productName: product.name, // Snapshot name in case it changes later
          price: product.price, // Snapshot price
          quantity: item.quantity,
        })
      }

      // 4. Save all Order Items
      await OrderItem.createMany(orderItemsToCreate, { client: trx })

      // 5. Update Order Total with the calculated value
      order.totalAmount = calculatedTotal
      await order.useTransaction(trx).save()

      // 6. Commit Transaction
      await trx.commit()

      return order
    } catch (error) {
      // 7. Rollback on any error (Out of stock, DB fail, etc.)
      await trx.rollback()
      throw error
    }
  }
}
