import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Address from '#models/address'
import Order from '#models/order'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare roles: ('SUPER_ADMIN' | 'CUSTOMER')[]

  // --- FIX: Set Default Role Here ---
  @beforeCreate()
  static async setDefaultRole(user: User) {
    if (!user.roles) {
      user.roles = ['CUSTOMER']
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Address)
  declare addresses: HasMany<typeof Address>

  @hasMany(() => Order)
  declare orders: HasMany<typeof Order>
}
