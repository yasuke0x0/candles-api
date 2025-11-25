import { HttpContext } from '@adonisjs/core/http'
import OrderService from '#services/order_service'
import User from '#models/user'
import string from '@adonisjs/core/helpers/string'

export default class OrdersController {
  private orderService = new OrderService()

  public async store({ request, response, auth }: HttpContext) {
    // 1. Explicitly type 'user' so it can accept a generic User model later
    let user: User | null = auth.user ?? null

    // 2. If no logged-in user, we MUST get customer info from the payload
    if (!user) {
      const customer = request.only(['email', 'firstName', 'lastName'])

      if (!customer.email || !customer.firstName || !customer.lastName) {
        return response.badRequest({
          message: 'Guest checkout requires email, first name, and last name.',
        })
      }

      // 3. Find existing user OR Create a new one
      user = await User.findBy('email', customer.email)

      if (!user) {
        // Create a new user with a random password
        user = await User.create({
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          password: string.random(32),
          roles: ['CUSTOMER'],
        })
      }
    }

    // 4. Validate Order Payload
    const payload = request.only(['items', 'shippingAddress', 'billingAddress', 'paymentIntentId'])

    if (!payload.items || payload.items.length === 0) {
      return response.badRequest({ message: 'Cart is empty' })
    }

    try {
      // 5. Create Order
      // We use the exclamation mark (user!) because our logic ensures user is not null here
      const order = await this.orderService.createOrder(user!, payload)

      return response.created({
        message: 'Order placed successfully',
        orderId: order.id,
      })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }
}
