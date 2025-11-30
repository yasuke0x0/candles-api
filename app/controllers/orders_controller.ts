import { HttpContext } from '@adonisjs/core/http'
import OrderService from '#services/order_service'
import User from '#models/user'
import string from '@adonisjs/core/helpers/string'
import stripe from 'stripe'
import env from '#start/env'
import HttpException from '#exceptions/http_exception'

const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'))

export default class OrdersController {
  private orderService = new OrderService()

  public async store({ request, response, auth }: HttpContext) {
    try {
      // 1. Authenticated User Logic
      let user: User | null = auth.user ?? null

      if (!user) {
        const customer = request.only(['email', 'firstName', 'lastName'])
        if (!customer.email || !customer.firstName || !customer.lastName) {
          throw new HttpException({
            message: 'Guest checkout requires contact details.',
            status: 400,
          })
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

      const payload = request.only([
        'items',
        'shippingAddress',
        'billingAddress',
        'paymentIntentId',
      ])
      let stripeAmount: number | undefined

      // --- SECURITY: Verify Stripe Payment ---
      if (payload.paymentIntentId) {
        try {
          const paymentIntent = await stripeClient.paymentIntents.retrieve(payload.paymentIntentId)

          // A. Ensure payment actually exists
          if (!paymentIntent) {
            throw new HttpException({
              message: 'Payment intent does not exist',
              status: 400,
            })
          }

          // C. Capture the amount paid (in cents) to verify against cart later
          stripeAmount = paymentIntent.amount
        } catch (err) {
          // If the error is already an HttpException (thrown above), re-throw it
          if (err instanceof HttpException) {
            throw err
          }
          console.error('Stripe Verify Error:', err)
          throw new HttpException({
            message: 'Invalid Payment Intent ID',
            status: 400,
          })
        }
      } else {
        throw new HttpException({
          message: 'Payment ID is required',
          status: 400,
        })
      }
      // ---------------------------------------

      // Pass the stripeAmount to the service for final verification
      // The Service will compare this amount against the database-calculated total
      const order = await this.orderService.createOrder(user!, payload, stripeAmount)

      return response.created({ message: 'Order placed successfully', orderId: order.id })
    } catch (error) {
      // If it's our custom HttpException, re-throw it so Adonis's exception handler picks it up
      if (error instanceof HttpException) {
        throw error
      }

      // For unexpected errors, you might want to log them and throw a generic 500 or let the global handler catch it
      // Here, we maintain the behavior of returning a bad request for service-level errors if they aren't typed yet,
      // or you can wrap them in HttpException as well.
      // Assuming orderService might throw generic errors for now:
      throw new HttpException({
        message: error.message || 'An unexpected error occurred while placing the order.',
        status: 400, // Or 500 based on the error type
      })
    }
  }
}
