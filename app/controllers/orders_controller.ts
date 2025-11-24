import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import OrderService from '#services/order_service'

@inject()
export default class OrdersController {
  constructor(private orderService: OrderService) {}

  /**
   * Create a new order
   * POST /orders
   */
  public async store({ request, response }: HttpContext) {
    try {
      // In a real app, you should validate 'request.all()' using a Validator first
      const orderData = request.all()

      // Delegate the logic to the OrderService
      const order = await this.orderService.createOrder(orderData)

      return response.created({
        message: 'Order placed successfully',
        orderId: order.id,
      })
    } catch (error) {
      console.error('Order Creation Failed:', error)
      return response.internalServerError({ message: 'Failed to place order' })
    }
  }
}
