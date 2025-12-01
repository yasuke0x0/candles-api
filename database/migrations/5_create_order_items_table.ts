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
      table.decimal('price', 12, 2).notNullable()

      // 2. Unit Net Price (e.g. 25.00)
      table.decimal('price_net', 12, 2).notNullable().defaultTo(0)

      // 3. VAT Rate (e.g. 20.00)
      table.decimal('vat_rate', 12, 2).notNullable().defaultTo(0)

      // 4. Total VAT Amount for this line (e.g. 5.00 * quantity)
      table.decimal('vat_amount', 12, 2).notNullable().defaultTo(0)

      // 5. Total Amount (Net + VAT - Discount) for this line
      table.decimal('total_price', 12, 2).notNullable().defaultTo(0)

      // --- DISCOUNT SNAPSHOTS ---
      // 6. Discount Amount (e.g. 5.00)
      table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0)

      // 7. Discount Description (e.g. "Summer Sale 10%")
      table.string('discount_description').nullable()

      table.integer('quantity').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
