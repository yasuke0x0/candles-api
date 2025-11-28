import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // User Link
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      // We use RESTRICT to prevent deleting an address if it is part of an order history
      table
        .integer('shipping_address_id')
        .unsigned()
        .references('addresses.id')
        .onDelete('RESTRICT')
        .notNullable()
      table
        .integer('billing_address_id')
        .unsigned()
        .references('addresses.id')
        .onDelete('RESTRICT')
        .notNullable()

      // Order Details
      table.decimal('total_amount', 10, 2).notNullable()
      table.string('status').defaultTo('pending')
      table.string('payment_intent_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
