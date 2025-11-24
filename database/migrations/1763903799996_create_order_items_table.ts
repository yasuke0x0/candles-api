import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'order_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign Keys
      table.integer('order_id').unsigned().references('orders.id').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('products.id')

      // Snapshot of data at time of purchase
      table.string('product_name')
      table.decimal('price', 10, 2)
      table.integer('quantity').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
