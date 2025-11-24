import Order from '#models/order'
import OrderItem from '#models/order_item'
import db from '@adonisjs/lucid/services/db'

export default class OrderService {
  public async createOrder(data: any) {
    const { items, total, ...customerInfo } = data

    // Start Transaction
    const trx = await db.transaction()

    try {
      // 1. Create Order
      const order = await Order.create(
        {
          ...customerInfo,
          totalAmount: total,
          status: 'pending',
        },
        { client: trx }
      )

      // 2. Prepare Items
      const orderItemsData = items.map((item: any) => ({
        orderId: order.id,
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
      }))

      // 3. Save Items
      await OrderItem.createMany(orderItemsData, { client: trx })

      // 4. Commit
      await trx.commit()

      return order
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
