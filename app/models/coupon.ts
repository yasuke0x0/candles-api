import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'

export default class Coupon extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string

  @column()
  declare description: string | null

  @column()
  declare type: 'PERCENTAGE' | 'FIXED'

  @column({ consume: (value) => Number(value) })
  declare value: number

  @column({ consume: (value) => Number(value) })
  declare minOrderAmount: number

  @column()
  declare maxUses: number | null

  @column()
  declare maxUsesPerUser: number

  @column()
  declare currentUses: number

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare startsAt: DateTime | null

  @column.dateTime()
  declare endsAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- Relationships ---
  @hasMany(() => Order)
  declare orders: HasMany<typeof Order>

  // --- Logic ---

  /**
   * Checks if the coupon is valid for a specific user and cart subtotal
   */
  async isValidFor(
    userId: number | null,
    cartSubtotal: number
  ): Promise<{ valid: boolean; reason?: string }> {
    const now = DateTime.now()

    // 1. Basic Active Checks
    if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' }
    if (this.startsAt && this.startsAt > now)
      return { valid: false, reason: 'Coupon has not started yet' }
    if (this.endsAt && this.endsAt < now) return { valid: false, reason: 'Coupon has expired' }

    // 2. Global Usage Limits
    if (this.maxUses && this.currentUses >= this.maxUses) {
      return { valid: false, reason: 'Coupon usage limit reached' }
    }

    // 3. Minimum Order Amount
    if (cartSubtotal < this.minOrderAmount) {
      return {
        valid: false,
        reason: `Your cart total needs to be at least €${this.minOrderAmount} to apply this coupon.`,
      }
    }

    // 4. Per User Limits (Only if user is logged in)
    if (userId) {
      // Count how many orders this user has with this coupon
      // Note: This relies on the relationship being set up in Order model
      const userUsage = await Order.query()
        .where('user_id', userId)
        .andWhere('coupon_id', this.id)
        .andWhereIn('status', ['succeeded', 'READY_TO_SHIP', 'SHIPPED'])
        .count('* as total')

      const count = userUsage[0].$extras.total

      if (count >= this.maxUsesPerUser) {
        return { valid: false, reason: 'You have already used this coupon' }
      }
    }

    return { valid: true }
  }

  /**
   * Calculates the discount amount based on a subtotal
   */
  calculateDiscount(subtotal: number): number {
    let discount = 0

    if (this.type === 'PERCENTAGE') {
      discount = subtotal * (this.value / 100)
    } else {
      discount = this.value
    }

    // Ensure we don't discount more than the subtotal (negative price)
    return Math.min(discount, subtotal)
  }
}
