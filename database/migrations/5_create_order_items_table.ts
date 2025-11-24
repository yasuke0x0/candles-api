import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'order_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign Keys
      table.integer('order_id').unsigned().references('orders.id').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('products.id').onDelete('SET NULL')

      // SNAPSHOT DATA (Crucial for historical accuracy)
      // Even if the product name or price changes in the future,
      // this order record remains unchanged.
      table.string('product_name').notNullable()
      table.decimal('price', 10, 2).notNullable() // Unit price at time of purchase

      table.integer('quantity').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
