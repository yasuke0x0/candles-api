import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // User Link
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      // Address Links
      table
        .integer('shipping_address_id')
        .unsigned()
        .references('addresses.id')
        .onDelete('RESTRICT')
        .notNullable()
      table
        .integer('billing_address_id')
        .unsigned()
        .references('addresses.id')
        .onDelete('RESTRICT')
        .notNullable()

      // --- FINANCIAL BREAKDOWN ---
      // 1. Net Amount (Price of items before tax)
      table.decimal('amount_without_vat', 10, 2).notNullable().defaultTo(0)

      // 2. VAT Amount (Total tax calculated)
      table.decimal('vat_amount', 10, 2).notNullable().defaultTo(0)

      // 3. Shipping Cost
      table.decimal('shipping_amount', 10, 2).notNullable().defaultTo(0)

      // 4. Total Amount (Net + VAT + Shipping) - Final charge to customer
      table.decimal('total_amount', 10, 2).notNullable()

      // ---------------------------

      table.string('status').defaultTo('pending')
      table.string('payment_intent_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
