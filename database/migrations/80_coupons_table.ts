import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'coupons'

  async up() {
    // 1. Create Coupons Table
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('code').unique().notNullable()
      table.string('description').nullable()

      table.enum('type', ['PERCENTAGE', 'FIXED']).notNullable()
      table.decimal('value', 12, 2).notNullable()

      // Conditions
      table.decimal('min_order_amount', 12, 2).defaultTo(0)

      // Limits
      table.integer('max_uses').nullable()
      table.integer('max_uses_per_user').defaultTo(1)
      table.integer('current_uses').defaultTo(0)

      // Validity
      table.boolean('is_active').defaultTo(true)
      table.timestamp('starts_at', { useTz: true }).nullable()
      table.timestamp('ends_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    // 2. Add relation to Orders
    this.schema.alterTable('orders', (table) => {
      table.integer('coupon_id').unsigned().references('coupons.id').onDelete('SET NULL')
      table.decimal('coupon_discount_amount', 12, 2).defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      // FIX: Drop the foreign key constraint first!
      table.dropForeign(['coupon_id'])

      // Then drop the columns
      table.dropColumn('coupon_id')
      table.dropColumn('coupon_discount_amount')
    })
    this.schema.dropTable(this.tableName)
  }
}
