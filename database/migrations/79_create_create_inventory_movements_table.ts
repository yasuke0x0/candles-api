import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'inventory_movements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Which product is moving?
      table
        .integer('product_id')
        .unsigned()
        .references('products.id')
        .onDelete('CASCADE')
        .notNullable()

      // Who caused the movement? (Nullable because system might do it auto-pilot later)
      table.integer('user_id').unsigned().references('users.id').onDelete('SET NULL').nullable()

      // Was it due to an order?
      table.integer('order_id').unsigned().references('orders.id').onDelete('CASCADE').nullable()

      // The movement amount.
      // Negative for sales/shrinkage (e.g., -5)
      // Positive for restock/returns (e.g., +50)
      table.integer('quantity').notNullable()

      // Why did this happen?
      // Enums: 'SALE', 'RESTOCK', 'MANUAL_ADJUSTMENT', 'RETURN', 'DAMAGED'
      table.string('type').notNullable()

      // Optional note for admins (e.g., "Found 2 broken jars")
      table.string('reason').nullable()

      // Snapshot: What was the stock AFTER this move? (Good for auditing)
      table.integer('stock_after').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
