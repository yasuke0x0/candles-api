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

      // --- STATUS (New) ---
      // 'ACTIVE' or 'ARCHIVED'
      table.string('status').defaultTo('ACTIVE').notNullable()

      // JSON column for Scent Notes
      table.json('scent_notes').nullable()

      // Inventory
      table.integer('stock').unsigned().defaultTo(0).notNullable()

      // --- PRICING & VAT ---
      table.decimal('price', 12, 2).notNullable()
      table.decimal('vat_rate', 10, 2).defaultTo(20.0).notNullable()

      table.decimal('length', 8, 2).defaultTo(0)
      table.decimal('width', 8, 2).defaultTo(0)
      table.decimal('height', 8, 2).defaultTo(0)
      table.decimal('weight', 8, 2).defaultTo(0)

      table.decimal('price_net', 12, 2).nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
