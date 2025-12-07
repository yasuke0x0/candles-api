import Coupon from '#models/coupon'

export default class CouponService {
  /**
   * List all coupons (paginated or all)
   */
  async getAllCoupons() {
    return Coupon.query().orderBy('createdAt', 'desc')
  }

  /**
   * Create a new coupon
   */
  async createCoupon(payload: any) {
    // 1. Destructure 'expiresAt' out of the payload so we don't pass it directly to the model
    const { expiresAt, ...rest } = payload

    const data = {
      ...rest,
      // 2. Map frontend 'expiresAt' to backend 'endsAt'
      endsAt: expiresAt,
      code: payload.code.toUpperCase().trim(),
    }

    // Now 'data' only contains fields that exist in the Coupon model
    return await Coupon.create(data)
  }

  /**
   * Update an existing coupon
   */
  async updateCoupon(id: number, payload: any) {
    const coupon = await Coupon.findOrFail(id)

    // 1. Destructure 'expiresAt' out
    const { expiresAt, ...rest } = payload

    // Create a mutable data object from the rest
    const data: any = { ...rest }

    // Helper transformations
    if (data.code) data.code = data.code.toUpperCase().trim()

    // 2. Map 'expiresAt' to 'endsAt' only if it was provided
    if (expiresAt !== undefined) {
      data.endsAt = expiresAt
    }

    coupon.merge(data)
    await coupon.save()
    return coupon
  }

  /**
   * Delete a coupon
   */
  async deleteCoupon(id: number) {
    const coupon = await Coupon.findOrFail(id)
    await coupon.delete()
  }
}
