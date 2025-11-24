import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Customer Info
      table.string('email').notNullable()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('address').notNullable()
      table.string('city').notNullable()
      table.string('zip').notNullable()
      table.string('country').notNullable()

      // Order Totals
      table.decimal('total_amount', 10, 2).notNullable()
      table.string('status').defaultTo('pending') // pending, paid, shipped

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
