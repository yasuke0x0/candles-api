import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column, computed } from '@adonisjs/lucid/orm'

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

  @column()
  declare stock: number

  // --- PRICING & VAT ---

  // The Gross Price (displayed to user)
  @column()
  declare price: number

  @column()
  declare vatRate: number

  @column()
  declare priceNet: number

  // Helper to format price
  @computed()
  get formattedPrice() {
    return `€${Number(this.price).toFixed(2)}`
  }

  // Auto-calculate Net Price before saving if it wasn't provided
  @beforeSave()
  static async calculateNetPrice(product: Product) {
    if (product.price && !product.priceNet) {
      const rate = product.vatRate || 20.0
      // Net = Gross / (1 + Rate/100)
      product.priceNet = Number(product.price) / (1 + rate / 100)
    }
  }

  // ---------------------

  @computed()
  get isOutOfStock() {
    return this.stock <= 0
  }

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
