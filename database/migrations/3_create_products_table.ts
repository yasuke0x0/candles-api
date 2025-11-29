import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Core Details
      table.string('name').notNullable()
      table.text('description').nullable()
      table.string('image').nullable()
      table.string('burn_time').nullable()
      table.boolean('is_new').defaultTo(false)
      table.json('scent_notes').nullable()

      // Inventory
      table.integer('stock').unsigned().defaultTo(0).notNullable()

      // --- PRICING & VAT ---
      // 'price' is the Public/Gross price (what the customer sees)
      table.decimal('price', 12, 2).notNullable()

      // VAT Details
      table.decimal('vat_rate', 10, 2).defaultTo(20.00).notNullable() // e.g., 20.00%

      // Calculated Price without VAT (Net)
      // We store this to avoid rounding errors during runtime calculations
      table.decimal('price_net', 12, 2).nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
