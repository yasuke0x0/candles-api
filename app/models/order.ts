import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OrderItem from '#models/order_item'
import Address from '#models/address'

export default class Order extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare status:
    | 'canceled'
    | 'created'
    | 'partially_funded'
    | 'payment_failed'
    | 'processing'
    | 'requires_action'
    | 'succeeded'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | string

  @column()
  declare shippingAddressId: number

  @belongsTo(() => Address, {
    foreignKey: 'shippingAddressId',
  })
  declare shippingAddress: BelongsTo<typeof Address>

  @column()
  declare billingAddressId: number

  @belongsTo(() => Address, {
    foreignKey: 'billingAddressId',
  })
  declare billingAddress: BelongsTo<typeof Address>

  // --- FINANCIAL BREAKDOWN ---
  @column()
  declare totalAmount: number // Grand Total (Net + VAT + Shipping)

  @column()
  declare amountWithoutVat: number // Subtotal Net

  @column()
  declare vatAmount: number // Total Tax

  @column()
  declare shippingAmount: number // Shipping Cost

  // ---------------------------

  @column()
  declare paymentIntentId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => OrderItem)
  declare items: HasMany<typeof OrderItem>
}
