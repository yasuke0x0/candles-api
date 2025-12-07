import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Address extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare companyName: string | null

  @column()
  declare streetAddressLineOne: string

  @column()
  declare streetAddressLineTwo: string | null

  @column()
  declare city: string

  @column()
  declare postalCode: string

  @column()
  declare country: string

  @column()
  declare type: 'SHIPPING' | 'BILLING'

  // --- NEW FIELDS ---
  @column()
  declare phonePrefix: string | null

  @column()
  declare phone: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- Relationships ---
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
