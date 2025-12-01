import type { HttpContext } from '@adonisjs/core/http'
import Coupon from '#models/coupon'
import { DateTime } from 'luxon'

export default class CouponsController {
  /**
   * Endpoint: POST /coupons/check
   */
  async check({ request, auth, response }: HttpContext) {
    // 1. Validate Input
    const { code, subtotal } = request.all()

    if (!code || subtotal === undefined) {
      return response.badRequest({ message: 'Code and subtotal are required' })
    }

    // 2. Find the Coupon
    const coupon = await Coupon.findBy('code', code)

    if (!coupon) {
      return response.status(404).json({
        valid: false,
        message: 'This coupon code does not exist.',
      })
    }

    // 3. Check Validity (using the logic added to the Model in the previous step)
    // We pass the logged-in user ID if available, otherwise null (guest checkout)
    const user = auth.user
    const validation = await coupon.isValidFor(user?.id || null, Number(subtotal))

    if (!validation.valid) {
      return response.status(422).json({
        valid: false,
        message: validation.reason, // e.g., "Minimum order of $50 required"
      })
    }

    // 4. Calculate the specific savings for this Cart
    // This allows the frontend to immediately show "-$10.00" without doing math
    const discountAmount = coupon.calculateDiscount(Number(subtotal))

    return response.ok({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type, // 'PERCENTAGE' or 'FIXED'
        value: coupon.value,
        description: coupon.description,
      },
      discountAmount: Number(discountAmount.toFixed(2)),
      newTotal: Number((subtotal - discountAmount).toFixed(2)),
      message: 'Coupon applied successfully!',
    })
  }

  /**
   * Endpoint: POST /coupons/seed
   * Usage: Development only. Creates fixtures.
   */
  async seed({ response }: HttpContext) {
    const now = DateTime.now()

    // Using updateOrCreateMany to prevent duplicates if you run this twice
    await Coupon.updateOrCreateMany('code', [
      {
        code: 'WELCOME10',
        description: '10% off your first order',
        type: 'PERCENTAGE',
        value: 10,
        isActive: true,
        maxUsesPerUser: 1,
      },
      {
        code: 'SAVE20',
        description: '$20 off orders over $100',
        type: 'FIXED',
        value: 20,
        minOrderAmount: 100, // Restriction
        isActive: true,
      },
      {
        code: 'SUMMER50',
        description: '50% off - Limited to first 100 people',
        type: 'PERCENTAGE',
        value: 50,
        maxUses: 100,
        currentUses: 0,
        isActive: true,
      },
      {
        code: 'EXPIRED',
        description: 'This coupon is old',
        type: 'FIXED',
        value: 5,
        isActive: true,
        endsAt: now.minus({ days: 1 }), // Ended yesterday
      },
      {
        code: 'VIPSECRET',
        description: 'Inactive coupon',
        type: 'PERCENTAGE',
        value: 30,
        isActive: false, // Manually disabled
      },
    ])

    return response.created({ message: 'Coupon fixtures seeded successfully' })
  }
}
