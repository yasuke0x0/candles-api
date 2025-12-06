import type { HttpContext } from '@adonisjs/core/http'
import Coupon from '#models/coupon'

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
}
