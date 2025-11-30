import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Order from '#models/order'
import HttpException from '#exceptions/http_exception'

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
        throw new HttpException({
          message: 'Missing signature or secret',
          status: 400,
        })
      }

      // Use raw body for signature verification
      // If this fails, it throws a Stripe SignatureVerificationError
      event = stripeClient.webhooks.constructEvent(request.raw() as string, sig, endpointSecret)
    } catch (err) {
      // If it's already our custom exception, rethrow
      if (err instanceof HttpException) {
        throw err
      }

      console.log(`Webhook Error: ${err.message}`)
      // Signature failure is a client error (400), do not retry
      throw new HttpException({
        message: `Webhook Error: ${err.message}`,
        status: 400,
      })
    }

    const paymentIntent = event.data.object as stripe.PaymentIntent

    console.log('id =>', paymentIntent.id)

    // 2. Handle specific events
    try {
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
    } catch (error) {
      // If handling the event logic fails (e.g. DB error),
      // we might WANT to throw a 500 so Stripe retries later.
      // But for now, let's wrap it in HttpException or just log it.
      console.error('Webhook processing failed', error)
      throw new HttpException({
        message: 'Webhook processing failed',
        status: 500, // Trigger Stripe retry
      })
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
      // Depending on logic, you might want to throw here to trigger retry
      // if the order creation is just lagging behind the webhook
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
