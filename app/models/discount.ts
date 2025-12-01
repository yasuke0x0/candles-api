import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'

export default class Discount extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare type: 'PERCENTAGE' | 'FIXED'

  @column()
  declare value: number

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

  @manyToMany(() => Product, {
    pivotTable: 'product_discounts',
  })
  declare products: ManyToMany<typeof Product>
}
