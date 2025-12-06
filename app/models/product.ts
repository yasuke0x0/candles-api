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

  @column({ consume: (value) => Number(value) })
  declare price: number

  @column({ consume: (value) => Number(value) })
  declare vatRate: number

  @column({ consume: (value) => Number(value) })
  declare priceNet: number

  // --- DIMENSIONS & SHIPPING (Used by PackagingService) ---

  @column({ consume: (value) => Number(value) })
  declare weight: number

  @column({ consume: (value) => Number(value) })
  declare length: number

  @column({ consume: (value) => Number(value) })
  declare width: number

  @column({ consume: (value) => Number(value) })
  declare height: number

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
   * Checks for active discounts and applies the BEST one (Lowest Price).
   * REQUIRES: .preload('discounts')
   */
  @computed()
  get currentPrice() {
    if (!this.discounts || this.discounts.length === 0) {
      return Number(this.price)
    }

    const now = DateTime.now()
    const basePrice = Number(this.price)

    // 1. Filter for ALL valid discounts
    const validDiscounts = this.discounts.filter((d) => {
      if (!d.isActive) return false
      if (d.startsAt && d.startsAt > now) return false
      if (d.endsAt && d.endsAt < now) return false
      return true
    })

    if (validDiscounts.length === 0) return basePrice

    // 2. Calculate potential price for each discount
    const potentialPrices = validDiscounts.map((d) => {
      if (d.type === 'PERCENTAGE') {
        return basePrice * (1 - d.value / 100)
      } else {
        // FIXED amount off
        return Math.max(0, basePrice - d.value)
      }
    })

    // 3. Select the Lowest Price (Best for Customer)
    const bestPrice = Math.min(...potentialPrices)

    return Number(bestPrice.toFixed(2))
  }

  // --- HOOKS ---

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

  @computed()
  get formattedPrice() {
    return `€${this.currentPrice.toFixed(2)}`
  }
}
