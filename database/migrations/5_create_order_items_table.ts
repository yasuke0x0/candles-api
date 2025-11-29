import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'order_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign Keys
      table.integer('order_id').unsigned().references('orders.id').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('products.id').onDelete('SET NULL')

      // --- SNAPSHOT DATA ---
      table.string('product_name').notNullable()

      // 1. Unit Gross Price (e.g. 30.00)
      table.decimal('price', 10, 2).notNullable()

      // 2. Unit Net Price (e.g. 25.00)
      table.decimal('price_net', 10, 2).notNullable().defaultTo(0)

      // 3. VAT Rate (e.g. 20.00)
      table.decimal('vat_rate', 10, 2).notNullable().defaultTo(0)

      // 4. Total VAT Amount for this line (e.g. 5.00 * quantity)
      table.decimal('vat_amount', 10, 2).notNullable().defaultTo(0)

      // 5. Total Gross Amount for this line (e.g. 30.00 * quantity)
      // This corresponds to "amount (net + vat)"
      table.decimal('total_price', 10, 2).notNullable().defaultTo(0)

      table.integer('quantity').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
