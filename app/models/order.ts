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
  declare totalAmount: number

  @column()
  declare status:
    | 'canceled' // Occurs when a PaymentIntent is canceled.
    | 'created' // Occurs when a new PaymentIntent is created.
    | 'partially_funded' // Occurs when funds are applied to a customer_balance PaymentIntent and the 'amount_remaining' changes.
    | 'payment_failed' // Occurs when a PaymentIntent has failed the attempt to create a payment method or a payment.
    | 'processing' // Occurs when a PaymentIntent has started processing.
    | 'requires_action' // Occurs when a PaymentIntent transitions to requires_action state
    | 'succeeded' // Occurs when a PaymentIntent has successfully completed payment.
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

  // ---------------------------------

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
