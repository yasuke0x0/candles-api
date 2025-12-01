import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Product from '#models/product'
import Coupon from '#models/coupon' // Import the Coupon model
import HttpException from '#exceptions/http_exception'

// Initialize Stripe
const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-11-17.clover', // Ensure this matches your stripe version
})

export default class PaymentController {
  public async createIntent({ request, response, auth }: HttpContext) {
    // 1. Get items AND couponCode from client
    const { items, couponCode } = request.body()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpException({ message: 'Cart is empty', status: 400 })
    }

    try {
      // 2. Fetch Products (Source of Truth)
      const productIds = items.map((item: any) => item.id)

      // Preload product discounts to get accurate currentPrice
      const dbProducts = await Product.query().whereIn('id', productIds).preload('discounts')
      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      let subtotal = 0

      // 3. Calculate Subtotal (Pre-coupon, Pre-shipping)
      for (const item of items) {
        const product = productMap.get(item.id)

        if (!product) {
          throw new HttpException({
            message: `Product ID ${item.id} unavailable.`,
            status: 400,
          })
        }

        if (product.stock < item.quantity) {
          throw new HttpException({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
            code: 'E_INSUFFICIENT_STOCK',
            status: 400,
          })
        }

        // Use the dynamic currentPrice (which includes product-level discounts)
        subtotal += Number(product.currentPrice) * item.quantity
      }

      // 4. Handle Coupon Logic
      let couponDiscount = 0
      let activeCoupon: Coupon | null = null

      if (couponCode) {
        // Find the coupon
        activeCoupon = await Coupon.findBy('code', couponCode)

        if (!activeCoupon) {
          throw new HttpException({
            message: `Coupon '${couponCode}' not found.`,
            status: 400,
          })
        }

        // Check validity (User ID is optional for guests)
        const user = auth.user
        const validation = await activeCoupon.isValidFor(user?.id || null, subtotal)

        if (!validation.valid) {
          throw new HttpException({
            message: `Coupon invalid: ${validation.reason}`,
            status: 400,
          })
        }

        // Calculate the actual discount amount
        couponDiscount = activeCoupon.calculateDiscount(subtotal)
      }

      // 5. Final Calculation
      const SHIPPING_COST = 15.0 // You might want to make this dynamic later

      // Subtotal - Coupon + Shipping
      let finalTotal = subtotal - couponDiscount + SHIPPING_COST

      // Safety check: Total cannot be negative
      if (finalTotal < 0) finalTotal = 0

      // 6. Convert to Cents for Stripe
      const amountInCents = Math.round(finalTotal * 100)

      // Stripe minimum charge check (approx $0.50 USD/EUR)
      if (amountInCents < 50) {
        throw new HttpException({
          message: 'Total amount is too low to process payment.',
          status: 400,
        })
      }

      // 7. Create PaymentIntent with Metadata
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          product_ids: productIds.join(','),
          coupon_id: activeCoupon ? activeCoupon.id.toString() : '',
          coupon_code: activeCoupon ? activeCoupon.code : '',
          original_subtotal: subtotal.toFixed(2),
          discount_amount: couponDiscount.toFixed(2),
        },
      })

      // 8. Return result to Client
      return response.ok({
        clientSecret: paymentIntent.client_secret,
        serverCalculatedTotal: finalTotal,
        discountApplied: couponDiscount,
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
