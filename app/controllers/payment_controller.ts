import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Product from '#models/product'
import HttpException from '#exceptions/http_exception'

// Initialize Stripe
const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-11-17.clover',
})

export default class PaymentController {
  public async createIntent({ request, response }: HttpContext) {
    // 1. Get only the necessary identification data from client
    const { items } = request.body()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpException({ message: 'Cart is empty', status: 400 })
    }

    try {
      // 2. Fetch the "Source of Truth" from Database
      const productIds = items.map((item: any) => item.id)

      // FIX: Preload discounts so 'currentPrice' is accurate
      const dbProducts = await Product.query().whereIn('id', productIds).preload('discounts')

      // Create a map for fast lookup: id -> Product
      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      let calculatedTotal = 0

      // 3. Iterate and Calculate Total on Server
      for (const item of items) {
        const product = productMap.get(item.id)

        // Security Check 1: Does product exist?
        if (!product) {
          throw new HttpException({
            message: `Product ID ${item.id} unavailable.`,
            status: 400,
          })
        }

        // Security Check 2: Is there enough stock? (Prevent overselling)
        if (product.stock < item.quantity) {
          throw new HttpException({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
            code: 'E_INSUFFICIENT_STOCK',
            status: 400,
          })
        }

        // Security Check 3: Use Discounted Price * Quantity
        calculatedTotal += Number(product.currentPrice) * item.quantity
      }

      // 4. Add Shipping & Taxes (Server-side logic)
      const SHIPPING_COST = 15.0
      calculatedTotal += SHIPPING_COST

      // 5. Convert to Cents (Stripe requires integers)
      const amountInCents = Math.round(calculatedTotal * 100)

      // Minimum charge check (Stripe requires usually > $0.50)
      if (amountInCents < 50) {
        throw new HttpException({
          message: 'Amount too low to process',
          status: 400,
        })
      }

      // 6. Create the PaymentIntent
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
      if (error instanceof HttpException) {
        throw error
      }

      console.error('Payment Intent Error:', error)

      throw new HttpException({
        message: 'Unable to initialize payment. Please contact support.',
        status: 400,
      })
    }
  }
}
