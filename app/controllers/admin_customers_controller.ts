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
      .where('roles', 'LIKE', '%"CUSTOMER"%')
      .preload('addresses')
      .preload('orders', (q) => q.whereIn('status', ['succeeded', 'SHIPPED', 'READY_TO_SHIP']))

    // --- UPDATED SEARCH LOGIC ---
    if (search) {
      const term = `%${search}%`

      query.where((group) => {
        // 1. Standard checks
        group.where('email', 'like', term)
        group.orWhere('first_name', 'like', term)
        group.orWhere('last_name', 'like', term)

        // 2. Combined: "Firstname Lastname" (e.g. "John Doe")
        // MySQL / PostgreSQL compatible CONCAT
        group.orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", [term])

        // 3. Combined: "Lastname Firstname" (e.g. "Doe John")
        group.orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", [term])
      })
    }
    // ----------------------------

    query.orderBy('created_at', 'desc')

    const users = await query.paginate(page, limit)

    const serialized = users.serialize().data.map((user: any) => {
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
