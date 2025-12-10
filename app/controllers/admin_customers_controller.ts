import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AdminCustomersController {
  /**
   * GET /api/admin/customers
   * List users with search, pagination, and basic stats (Total Orders, Total Spent)
   */
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search')

    const query = User.query()
      .where('roles', 'LIKE', '%"CUSTOMER"%') // Optional: Filter only customers if you have admin users mixed in
      .preload('addresses')
      // Preload orders to calculate stats on the fly (for a simple implementation)
      // For high-scale apps, you would use a separate 'stats' table or aggregate queries.
      .preload('orders', (q) => q.whereIn('status', ['succeeded', 'SHIPPED', 'READY_TO_SHIP']))

    // Search Logic (Name or Email)
    if (search) {
      query.where((q) => {
        q.where('email', 'like', `%${search}%`)
          .orWhere('first_name', 'like', `%${search}%`)
          .orWhere('last_name', 'like', `%${search}%`)
      })
    }

    query.orderBy('created_at', 'desc')

    const users = await query.paginate(page, limit)

    // Serialize and attach computed stats
    const serialized = users.serialize().data.map((user: any) => {
      // We have to find the original model in 'users' array to access the preloaded 'orders'
      // effectively, but since serialize() converts to JSON, we can do this cleaner:

      const originalUser = users.find((u) => u.id === user.id)
      const validOrders = originalUser?.orders || []

      const totalOrders = validOrders.length
      const totalSpent = validOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

      return {
        ...user,
        stats: {
          totalOrders,
          totalSpent: Number(totalSpent.toFixed(2)),
        },
        // We don't need to send the full order list in the index view
        orders: undefined,
      }
    })

    return response.ok({
      meta: users.getMeta(),
      data: serialized,
    })
  }

  /**
   * GET /api/admin/customers/:id
   * Get single customer details with full address list and order history
   */
  public async show({ params, response }: HttpContext) {
    try {
      const user = await User.query()
        .where('id', params.id)
        .preload('addresses') // Customer Addresses
        .preload('orders', (ordersQuery) => {
          ordersQuery.orderBy('created_at', 'desc')
          ordersQuery.preload('items') // Order Items
        })
        .firstOrFail()

      // Calculate Lifetime Stats
      const totalOrders = user.orders.length
      const totalSpent = user.orders.reduce((sum, order) => {
        // Only count paid/valid orders for lifetime value
        if (['succeeded', 'SHIPPED', 'READY_TO_SHIP'].includes(order.status)) {
          return sum + Number(order.totalAmount)
        }
        return sum
      }, 0)

      return response.ok({
        ...user.serialize(),
        stats: {
          totalOrders,
          totalSpent: Number(totalSpent.toFixed(2)),
        },
      })
    } catch (error) {
      return response.notFound({ message: 'Customer not found' })
    }
  }
}
