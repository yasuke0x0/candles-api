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
  declare recipientName: string

  @column()
  declare streetAddress: string

  @column()
  declare city: string

  @column()
  declare postalCode: string

  @column()
  declare country: string

  @column()
  declare label: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // --- Relationships ---
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
