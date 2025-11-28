import { HttpContext } from '@adonisjs/core/http'
import OrderService from '#services/order_service'
import User from '#models/user'
import string from '@adonisjs/core/helpers/string'
import stripe from 'stripe'
import env from '#start/env'

const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'))

export default class OrdersController {
  private orderService = new OrderService()

  public async store({ request, response, auth }: HttpContext) {
    // 1. Authenticated User Logic (Same as before)
    let user: User | null = auth.user ?? null

    if (!user) {
      const customer = request.only(['email', 'firstName', 'lastName'])
      if (!customer.email || !customer.firstName || !customer.lastName) {
        return response.badRequest({ message: 'Guest checkout requires contact details.' })
      }
      user = await User.findBy('email', customer.email)
      if (!user) {
        user = await User.create({
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          password: string.random(32),
          roles: ['CUSTOMER'],
        })
      }
    }

    const payload = request.only(['items', 'shippingAddress', 'billingAddress', 'paymentIntentId'])

    // --- SECURITY: Verify Stripe Payment ---
    if (payload.paymentIntentId) {
      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(payload.paymentIntentId)

        if (!paymentIntent) {
          return response.badRequest({ message: 'Payment intent does not exist' })
        }

        // Optional: Verify amount matches cart total (Best Practice)
        // const expectedAmount = ... calculate from DB ...
        // if (paymentIntent.amount !== expectedAmount) throw Error("Amount mismatch")
      } catch (err) {
        return response.badRequest({ message: 'Invalid Payment Intent' })
      }
    } else {
      return response.badRequest({ message: 'Payment ID is required' })
    }
    // ---------------------------------------

    try {
      const order = await this.orderService.createOrder(user!, payload)
      return response.created({ message: 'Order placed successfully', orderId: order.id })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }
}
