import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import CouponService from '#services/coupon_service'
import Coupon from '#models/coupon'
import Discount from '#models/discount'

@inject()
export default class CouponsController {
  constructor(protected couponService: CouponService) {}

  /**
   * GET /api/admin/coupons
   * List all coupons for the admin dashboard
   */
  public async index({ response }: HttpContext) {
    const coupons = await this.couponService.getAllCoupons()
    return response.ok(coupons)
  }

  /**
   * POST /api/admin/coupons
   * Create a new coupon
   */
  public async store({ request, response }: HttpContext) {
    const payload = request.only([
      'code',
      'type',
      'value',
      'description',
      'isActive',
      'expiresAt',
      'minOrderAmount',
      'maxUses',
    ])

    // Basic Validation
    if (!payload.code || !payload.value || !payload.type) {
      return response.badRequest({ message: 'Code, Type, and Value are required.' })
    }

    // Check for duplicate code
    const existing = await Coupon.findBy('code', payload.code)
    if (existing) {
      return response.badRequest({ message: 'Coupon code already exists.' })
    }

    const coupon = await this.couponService.createCoupon(payload)
    return response.created(coupon)
  }

  /**
   * PUT /api/admin/coupons/:id
   * Update an existing coupon
   */
  public async update({ params, request, response }: HttpContext) {
    const payload = request.only([
      'code',
      'type',
      'value',
      'description',
      'isActive',
      'expiresAt',
      'minOrderAmount',
      'maxUses',
    ])

    try {
      const coupon = await this.couponService.updateCoupon(params.id, payload)
      return response.ok(coupon)
    } catch (error) {
      return response.notFound({ message: 'Coupon not found' })
    }
  }

  /**
   * DELETE /api/admin/coupons/:id
   */
  public async destroy({ params, response }: HttpContext) {
    try {
      await this.couponService.deleteCoupon(params.id)
      return response.noContent()
    } catch (error) {
      return response.notFound({ message: 'Coupon not found' })
    }
  }

  // --- EXISTING METHODS (Preserved) ---

  /**
   * GET /api/discounts
   * (Preserved from your previous code for Product Discounts)
   */
  public async listDiscounts({ response }: HttpContext) {
    const discounts = await Discount.query().where('isActive', true).orderBy('createdAt', 'desc')
    return response.ok(discounts)
  }

  /**
   * POST /api/coupons/check
   * Public endpoint to validate cart coupons
   */
  async check({ request, auth, response }: HttpContext) {
    const { code, subtotal } = request.all()

    if (!code || subtotal === undefined) {
      return response.badRequest({ message: 'Code and subtotal are required' })
    }

    const coupon = await Coupon.findBy('code', code)

    if (!coupon) {
      return response.status(404).json({
        valid: false,
        message: 'This coupon code does not exist.',
      })
    }

    const user = auth.user
    const validation = await coupon.isValidFor(user?.id || null, Number(subtotal))

    if (!validation.valid) {
      return response.status(422).json({
        valid: false,
        message: validation.reason,
      })
    }

    const discountAmount = coupon.calculateDiscount(Number(subtotal))

    return response.ok({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
      discountAmount: Number(discountAmount.toFixed(2)),
      newTotal: Number((subtotal - discountAmount).toFixed(2)),
      message: 'Coupon applied successfully!',
    })
  }
}
