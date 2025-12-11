import { HttpContext } from '@adonisjs/core/http'
import stripe from 'stripe'
import env from '#start/env'
import Product from '#models/product'
import Coupon from '#models/coupon'
import HttpException from '#exceptions/http_exception'
import ShippoService from '#services/shippo_service' // 1. Import Service

// Initialize Stripe
const stripeClient = new stripe(env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2025-11-17.clover',
})

export default class PaymentController {
  private shippoService = new ShippoService() // 2. Instantiate Service

  public async createIntent({ request, response, auth }: HttpContext) {
    // Get items, couponCode AND shippingAddress
    const { items, couponCode, shippingAddress } = request.body()

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpException({ message: 'Cart is empty', status: 400 })
    }

    try {
      // --- 1. Product Validation & Subtotal ---
      const productIds = items.map((item: any) => item.id)
      const dbProducts = await Product.query().whereIn('id', productIds).preload('discount')
      const productMap = new Map(dbProducts.map((p) => [p.id, p]))

      let subtotal = 0

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

        subtotal += Number(product.currentPrice) * item.quantity
      }

      // --- 2. Coupon Logic ---
      let couponDiscount = 0
      let activeCoupon: Coupon | null = null

      if (couponCode) {
        activeCoupon = await Coupon.findBy('code', couponCode)
        if (!activeCoupon) {
          throw new HttpException({ message: `Coupon '${couponCode}' not found.`, status: 400 })
        }

        const user = auth.user
        const validation = await activeCoupon.isValidFor(user?.id || null, subtotal)
        if (!validation.valid) {
          throw new HttpException({ message: `Coupon invalid: ${validation.reason}`, status: 400 })
        }
        couponDiscount = activeCoupon.calculateDiscount(subtotal)
      }

      // --- 3. Dynamic Shipping Calculation (Shippo) ---
      const rateData = await this.shippoService.getShippingRate(shippingAddress, items)

      // Handle response (could be object or flat fallback number)
      let shippingCost = 0
      if (typeof rateData === 'number') {
        shippingCost = rateData
      } else {
        shippingCost = rateData.cost
      }

      // --- 4. Final Total ---
      let finalTotal = subtotal - couponDiscount + shippingCost
      if (finalTotal < 0) finalTotal = 0

      const amountInCents = Math.round(finalTotal * 100)

      if (amountInCents < 50) {
        throw new HttpException({
          message: 'Total amount is too low to process payment.',
          status: 400,
        })
      }

      // --- 5. Create Stripe Intent ---
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: {
          product_ids: productIds.join(','),
          coupon_id: activeCoupon ? activeCoupon.id.toString() : '',
          coupon_code: activeCoupon ? activeCoupon.code : '',
          original_subtotal: subtotal.toFixed(2),
          discount_amount: couponDiscount.toFixed(2),
          shipping_cost: shippingCost.toFixed(2), // Store shipping cost in metadata
        },
      })

      return response.ok({
        clientSecret: paymentIntent.client_secret,
        serverCalculatedTotal: finalTotal,
        discountApplied: couponDiscount,
        shippingCost: shippingCost, // Return to frontend to update UI
      })
    } catch (error) {
      if (error instanceof HttpException) throw error
      console.error('Payment Intent Error:', error)
      throw new HttpException({
        message: 'Unable to initialize payment. Please contact support.',
        status: 400,
      })
    }
  }
}
