import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import Product from '#models/product'

export default class OrderItem extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare orderId: number

  @column()
  declare productId: number | null

  @column()
  declare productName: string

  @column()
  declare quantity: number

  // --- PRICING SNAPSHOTS ---

  // Unit Price (Gross)
  @column()
  declare price: number

  // Unit Price (Net / Without VAT)
  @column()
  declare priceNet: number

  // VAT %
  @column()
  declare vatRate: number

  // Total VAT for this line
  @column()
  declare vatAmount: number

  // Total Amount (Net + VAT) for this line
  @column()
  declare totalPrice: number

  // -------------------------

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- Relationships ---

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>
}
