import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Product from '#models/product'

// Initialize Stripe
const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-11-17.clover',
})

export default class PaymentController {
  public async createIntent({ request, response }: HttpContext) {
    // 1. Get only the necessary identification data from client
    const { items } = request.body()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return response.badRequest({ message: 'Cart is empty' })
    }

    try {
      // 2. Fetch the "Source of Truth" from Database
      const productIds = items.map((item: any) => item.id)
      const dbProducts = await Product.query().whereIn('id', productIds)

      // Create a map for fast lookup: id -> Product
      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      let calculatedTotal = 0

      // 3. Iterate and Calculate Total on Server
      for (const item of items) {
        const product = productMap.get(item.id)

        // Security Check 1: Does product exist?
        if (!product) {
          // REFACTOR: Return directly instead of throwing
          return response.badRequest({ message: `Product ID ${item.id} unavailable.` })
        }

        // Security Check 2: Is there enough stock? (Prevent overselling)
        if (product.stock < item.quantity) {
          // REFACTOR: Return directly instead of throwing
          return response.badRequest({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
          })
        }

        // Security Check 3: Use Database Price * Quantity
        calculatedTotal += Number(product.price) * item.quantity
      }

      // 4. Add Shipping & Taxes (Server-side logic)
      const SHIPPING_COST = 15.0
      calculatedTotal += SHIPPING_COST

      // 5. Convert to Cents (Stripe requires integers)
      const amountInCents = Math.round(calculatedTotal * 100)

      // Minimum charge check (Stripe requires usually > $0.50)
      if (amountInCents < 50) {
        // REFACTOR: Return directly
        return response.badRequest({ message: 'Amount too low to process' })
      }

      // 6. Create the PaymentIntent
      // This call to Stripe might fail (network, api key), so it stays in the try block
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          product_ids: productIds.join(','),
        },
      })

      // 7. Send the secure Client Secret
      return response.ok({
        clientSecret: paymentIntent.client_secret,
        serverCalculatedTotal: calculatedTotal,
      })
    } catch (error) {
      // Log the full error internally for debugging
      console.error('Payment Intent Error:', error)

      // SECURITY: Return a generic message to the client to avoid exposing DB/Internal details
      return response.badRequest({
        message: 'Unable to initialize payment. Please contact support.'
      })
    }
  }
}
