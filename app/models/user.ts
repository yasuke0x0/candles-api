import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import Address from '#models/address'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column({ serializeAs: null })
  declare password: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare roles: ('SUPER_ADMIN' | 'CUSTOMER')[]

  @beforeCreate()
  static async setDefaultRole(user: User) {
    if (!user.roles) {
      user.roles = ['CUSTOMER']
    }
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Address)
  declare addresses: HasMany<typeof Address>

  @hasMany(() => Order)
  declare orders: HasMany<typeof Order>

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
