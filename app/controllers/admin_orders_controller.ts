// app/controllers/admin_orders_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Order from '#models/order'
import HttpException from '#exceptions/http_exception'

export default class AdminOrdersController {
  /**
   * GET /api/admin/orders
   * Lists all orders with pagination and optional status filter.
   * Query Params: ?page=1 & ?limit=20 & ?status=created & ?search=... & ?startDate=...
   */
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    // Filters
    const status = request.input('status')
    const search = request.input('search')
    const startDate = request.input('startDate')
    const endDate = request.input('endDate')

    const query = Order.query()
      .preload('user') // Show who bought it
      .preload('items') // Show item count
      .orderBy('createdAt', 'desc') // Newest first

    // 1. Status Filter
    if (status && status !== 'ALL') {
      query.where('status', status)
    }

    // 2. Date Range Filter
    if (startDate) {
      query.where('createdAt', '>=', startDate)
    }
    if (endDate) {
      // Create a date object for the end of the day
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      query.where('createdAt', '<=', endDateTime.toISOString())
    }

    // 3. Search Filter (Order ID, Email, Name)
    if (search) {
      const searchTerm = `%${search}%`

      query.where((group) => {
        // FIX: Use CAST(id AS CHAR) for MySQL compatibility
        group.whereRaw('CAST(id AS CHAR) LIKE ?', [searchTerm])

        // Search inside User relation
        group.orWhereHas('user', (userQuery) => {
          userQuery
            .where('email', 'like', searchTerm)
            .orWhere('firstName', 'like', searchTerm)
            .orWhere('lastName', 'like', searchTerm)
        })
      })
    }

    const orders = await query.paginate(page, limit)

    return response.ok(orders)
  }

  /**
   * GET /api/admin/orders/:id
   * Fetch full details for a single order.
   */
  public async show({ params, response }: HttpContext) {
    const order = await Order.find(params.id)

    if (!order) {
      throw new HttpException({ message: 'Order not found', status: 404 })
    }

    // Preload everything needed for fulfillment
    await order.load((loader) => {
      loader.load('user')
      loader.load('items', (itemQuery) => {
        itemQuery.preload('product')
      })
      loader.load('shippingAddress')
      loader.load('billingAddress')
      loader.load('coupon')
    })

    return response.ok(order)
  }

  /**
   * PUT /api/admin/orders/:id/status
   * Update the order status.
   */
  public async updateStatus({ params, request, response }: HttpContext) {
    const order = await Order.find(params.id)

    if (!order) {
      throw new HttpException({ message: 'Order not found', status: 404 })
    }

    const { status } = request.only(['status'])

    const validStatuses = [
      'created',
      'processing',
      'partially_funded',
      'succeeded',
      'READY_TO_SHIP',
      'SHIPPED',
      'canceled',
      'requires_action',
    ]

    if (!status || !validStatuses.includes(status)) {
      throw new HttpException({
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
        status: 400,
      })
    }

    order.status = status
    await order.save()

    return response.ok({
      message: `Order #${order.id} updated to ${status}`,
      order,
    })
  }
}
