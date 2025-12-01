import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'discounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('name').notNullable() // e.g., "Summer Sale"
      table.string('type').notNullable().defaultTo('PERCENTAGE') // 'PERCENTAGE' or 'FIXED'
      table.decimal('value', 10, 2).notNullable() // e.g., 20.00 (for 20%) or 10.00 (for $10 off)

      table.boolean('is_active').defaultTo(true)
      table.timestamp('starts_at').nullable()
      table.timestamp('ends_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // Pivot table for Many-to-Many relation (Product <-> Discount)
    // A product can have a discount, and a discount can apply to many products
    this.schema.createTable('product_discounts', (table) => {
      table.increments('id')
      table.integer('product_id').unsigned().references('products.id').onDelete('CASCADE')
      table.integer('discount_id').unsigned().references('discounts.id').onDelete('CASCADE')
      table.unique(['product_id', 'discount_id'])
    })
  }

  async down() {
    this.schema.dropTable('product_discounts')
    this.schema.dropTable(this.tableName)
  }
}
