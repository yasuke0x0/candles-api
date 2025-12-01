import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // User Link
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      // Address Links
      // We use 'RESTRICT' on delete because we never want to lose the address history of an order.
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
      table.decimal('amount_without_vat', 12, 2).notNullable().defaultTo(0)

      // 2. VAT Amount (Total tax calculated)
      table.decimal('vat_amount', 12, 2).notNullable().defaultTo(0)

      // 3. Shipping Cost
      table.decimal('shipping_amount', 12, 2).notNullable().defaultTo(0)

      // 4. Total Discount (Sum of all discounts applied)
      table.decimal('total_discount', 12, 2).notNullable().defaultTo(0)

      // 5. Total Amount (Net + VAT + Shipping - Discount) - Final charge to customer
      table.decimal('total_amount', 12, 2).notNullable()

      // ---------------------------

      // Status
      table.string('status').defaultTo('created').notNullable()

      // Stripe Payment ID for reconciliation/refunds
      table.string('payment_intent_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
