import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Order from '#models/order'

const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-11-17.clover',
})

export default class StripeWebhooksController {
  public async handle({ request, response }: HttpContext) {
    const sig = request.header('stripe-signature')
    const endpointSecret = env.get('STRIPE_WEBHOOK_SECRET')

    let event: stripe.Event

    try {
      // 1. Verify the event came from Stripe
      if (!sig || !endpointSecret) {
        // console.error('Missing signature or secret')
        throw new Error('Missing signature or secret')
      }

      // Use raw body for signature verification
      event = stripeClient.webhooks.constructEvent(
        request.raw() as string, // Ensure bodyparser is configured to provide raw body for this route
        sig,
        endpointSecret
      )
    } catch (err) {
      console.log(`Webhook Error: ${err.message}`)
      return response.badRequest(`Webhook Error: ${err.message}`)
    }

    const paymentIntent = event.data.object as stripe.PaymentIntent

    console.log('id =>', paymentIntent.id)

    // 2. Handle specific events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(paymentIntent)
        break

      // Handle other event types...
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return response.ok({ received: true })
  }

  private async handlePaymentSuccess(paymentIntent: stripe.PaymentIntent) {
    // Find order by paymentIntentId
    const order = await Order.findBy('paymentIntentId', paymentIntent.id)

    if (order) {
      order.status = 'succeeded'
      // Optional: Update totalAmount if it changed or verify it matches
      await order.save()
    } else {
      console.error(`Order not found for PaymentIntent: ${paymentIntent.id}`)
    }
  }

  private async handlePaymentFailure(paymentIntent: stripe.PaymentIntent) {
    const order = await Order.findBy('paymentIntentId', paymentIntent.id)

    if (order) {
      order.status = 'failed'
      await order.save()
    }
  }
}
