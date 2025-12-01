import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'coupons'

  async up() {
    // 1. Create Coupons Table
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('code').unique().notNullable() // e.g., "WELCOME10"
      table.string('description').nullable()

      table.enum('type', ['PERCENTAGE', 'FIXED']).notNullable()
      table.decimal('value', 12, 2).notNullable()

      // Conditions
      table.decimal('min_order_amount', 12, 2).defaultTo(0) // Minimum subtotal required

      // Limits
      table.integer('max_uses').nullable() // Global limit (e.g., first 100 people)
      table.integer('max_uses_per_user').defaultTo(1) // Limit per customer
      table.integer('current_uses').defaultTo(0) // Track total usage

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
      // Optional: Explicitly track how much the coupon saved distinct from product discounts
      table.decimal('coupon_discount_amount', 12, 2).defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('coupon_id')
      table.dropColumn('coupon_discount_amount')
    })
    this.schema.dropTable(this.tableName)
  }
}
