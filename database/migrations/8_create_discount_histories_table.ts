import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'discount_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('product_id').unsigned().references('products.id').onDelete('CASCADE')
      table.integer('discount_id').unsigned().references('discounts.id').onDelete('SET NULL')

      // Snapshot of the discount at that moment
      table.string('discount_name')
      table.string('discount_type') // PERCENTAGE / FIXED
      table.decimal('discount_value', 10, 2)

      // Snapshot of price impact
      table.decimal('original_price', 10, 2)
      table.decimal('discounted_price', 10, 2)

      table.timestamp('applied_at').defaultTo(this.now())
      table.timestamp('removed_at').nullable() // Null means currently active (or until another history record starts)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
