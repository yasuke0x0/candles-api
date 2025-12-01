import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import OrderItem from '#models/order_item'
import Address from '#models/address'

export default class Order extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // --- RELATIONSHIPS ---

  @column()
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

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

  @hasMany(() => OrderItem)
  declare items: HasMany<typeof OrderItem>

  // --- FINANCIAL DATA ---

  // Grand Total (What the customer actually paid)
  // Formula: amountWithoutVat + vatAmount + shippingAmount - totalDiscount (if discount is applied after VAT)
  // Usually, totalAmount is the final charge.
  @column()
  declare totalAmount: number

  // Subtotal before tax
  @column()
  declare amountWithoutVat: number

  // Total Tax
  @column()
  declare vatAmount: number

  // Shipping Cost
  @column()
  declare shippingAmount: number

  // Total Discount Applied
  @column()
  declare totalDiscount: number

  // --- META DATA ---

  @column()
  declare status:
    | 'created' // Initial state
    | 'processing' // Payment confirmed
    | 'ready_to_ship' // Warehouse processing
    | 'shipped' // Handed to carrier
    | 'delivered' // Done
    | 'canceled' // Stopped
    | 'refunded' // Money returned
    | string

  @column()
  declare paymentIntentId: string | null

  // --- TIMESTAMPS ---

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
