import { DateTime } from 'luxon'
import { BaseModel, beforeSave, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Discount from '#models/discount'
import DiscountHistory from '#models/discount_history'

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // ... (Other columns: name, description, etc... remain the same) ...
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
  @column()
  declare status: 'ACTIVE' | 'ARCHIVED'
  @column()
  declare stock: number
  @column({ consume: (value) => Number(value) })
  declare price: number // -- Price including VAT
  @column({ consume: (value) => Number(value) })
  declare vatRate: number
  @column({ consume: (value) => Number(value) })
  declare priceNet: number // -- Price without VAT
  @column({ consume: (value) => Number(value) })
  declare weight: number
  @column({ consume: (value) => Number(value) })
  declare length: number
  @column({ consume: (value) => Number(value) })
  declare width: number
  @column({ consume: (value) => Number(value) })
  declare height: number
  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare scentNotes: string[]

  @column()
  declare discountId: number | null

  @belongsTo(() => Discount)
  declare discount: BelongsTo<typeof Discount>

  @hasMany(() => DiscountHistory)
  declare discountHistory: HasMany<typeof DiscountHistory>

  // --- UPDATED DYNAMIC PRICING LOGIC ---
  @computed()
  get currentPrice() {
    const basePrice = Number(this.price)

    // 1. Check if discount exists
    if (!this.discount || !this.discountId) {
      return basePrice
    }

    const d = this.discount

    // 2. Check Validity Dates & Soft Delete
    const now = DateTime.now()
    if (d.deletedAt) return basePrice
    if (d.startsAt && d.startsAt > now) return basePrice
    if (d.endsAt && d.endsAt < now) return basePrice

    // 3. Calculate Price
    let finalPrice = basePrice
    if (d.type === 'PERCENTAGE') {
      finalPrice = basePrice * (1 - d.value / 100)
    } else {
      finalPrice = Math.max(0, basePrice - d.value)
    }

    return Number(finalPrice.toFixed(2))
  }

  @computed()
  get isOutOfStock() {
    return this.stock <= 0
  }

  // -- Price without VAP
  @beforeSave()
  static async calculateNetPrice(product: Product) {
    if (product.price) {
      const rate = product.vatRate || 20.0
      product.priceNet = Number(product.price) / (1 + rate / 100)
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @computed()
  get formattedPrice() {
    return `€${this.currentPrice.toFixed(2)}`
  }
}
