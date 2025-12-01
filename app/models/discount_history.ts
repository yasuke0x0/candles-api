import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'
import Discount from '#models/discount'

export default class DiscountHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare productId: number

  @column()
  declare discountId: number | null

  @column()
  declare discountName: string

  @column()
  declare discountType: string

  @column()
  declare discountValue: number

  @column()
  declare originalPrice: number

  @column()
  declare discountedPrice: number

  @column.dateTime({ autoCreate: true })
  declare appliedAt: DateTime

  @column.dateTime()
  declare removedAt: DateTime | null

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => Discount)
  declare discount: BelongsTo<typeof Discount>
}
