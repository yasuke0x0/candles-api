import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column, computed, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Discount from '#models/discount'
import DiscountHistory from '#models/discount_history'

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare image: string

  @column()
  declare burnTime: string

  @column()
  declare isNew: boolean

  // --- INVENTORY ---
  @column()
  declare stock: number

  @computed()
  get isOutOfStock() {
    return this.stock <= 0
  }

  // --- PRICING & VAT ---

  // The Base/Gross Price (Reference price)
  @column()
  declare price: number

  @column()
  declare vatRate: number

  @column()
  declare priceNet: number

  // --- RELATIONS ---

  @manyToMany(() => Discount, {
    pivotTable: 'product_discounts',
  })
  declare discounts: ManyToMany<typeof Discount>

  @hasMany(() => DiscountHistory)
  declare discountHistory: HasMany<typeof DiscountHistory>

  // --- DYNAMIC PRICING LOGIC ---

  /**
   * Calculates the real price the user should pay.
   * Checks for active discounts that are valid right now.
   * REQUIRES: .preload('discounts') to be called in the controller.
   */
  @computed()
  get currentPrice() {
    // If discounts weren't preloaded or there are none, return base price
    if (!this.discounts || this.discounts.length === 0) {
      return Number(this.price)
    }

    const now = DateTime.now()

    // Find the single best applicable discount
    // You could sort this to find the highest value if you allow multiple
    const activeDiscount = this.discounts.find((d) => {
      if (!d.isActive) return false
      if (d.startsAt && d.startsAt > now) return false
      if (d.endsAt && d.endsAt < now) return false
      return true
    })

    if (!activeDiscount) return Number(this.price)

    let finalPrice = Number(this.price)

    if (activeDiscount.type === 'PERCENTAGE') {
      // Example: 20% off
      finalPrice = finalPrice * (1 - activeDiscount.value / 100)
    } else if (activeDiscount.type === 'FIXED') {
      // Example: 10€ off
      finalPrice = Math.max(0, finalPrice - activeDiscount.value)
    }

    // Return rounded to 2 decimal places
    return Number(finalPrice.toFixed(2))
  }

  // Formatted string for UI (e.g. "€25.00")
  @computed()
  get formattedPrice() {
    return `€${this.currentPrice.toFixed(2)}`
  }

  // --- HOOKS ---

  // Auto-calculate Net Price (Price without VAT) before saving
  @beforeSave()
  static async calculateNetPrice(product: Product) {
    if (product.price) {
      const rate = product.vatRate || 20.0
      // Net = Gross / (1 + Rate/100)
      product.priceNet = Number(product.price) / (1 + rate / 100)
    }
  }

  // --- TIMESTAMPS ---

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare scentNotes: string[]
}
