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
    // 1. Authenticated User Logic
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
    let stripeAmount: number | undefined

    // --- SECURITY: Verify Stripe Payment ---
    if (payload.paymentIntentId) {
      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(payload.paymentIntentId)

        // A. Ensure payment actually exists
        if (!paymentIntent) {
          return response.badRequest({ message: 'Payment intent does not exist' })
        }

        // B. Ensure payment was successful
        // Note: For some async payment methods, status might be 'processing'.
        // Adjust strictness based on your needs. 'succeeded' is safest for cards.
        if (paymentIntent.status !== 'succeeded') {
          return response.badRequest({
            message: `Payment not completed. Status: ${paymentIntent.status}`,
          })
        }

        // C. Capture the amount paid (in cents) to verify against cart later
        stripeAmount = paymentIntent.amount
      } catch (err) {
        console.error('Stripe Verify Error:', err)
        return response.badRequest({ message: 'Invalid Payment Intent ID' })
      }
    } else {
      return response.badRequest({ message: 'Payment ID is required' })
    }
    // ---------------------------------------

    try {
      // Pass the stripeAmount to the service for final verification
      // The Service will compare this amount against the database-calculated total
      const order = await this.orderService.createOrder(user!, payload, stripeAmount)

      return response.created({ message: 'Order placed successfully', orderId: order.id })
    } catch (error) {
      // Return error message (e.g. "Security Mismatch" or "Out of Stock")
      return response.badRequest({ message: error.message })
    }
  }
}
