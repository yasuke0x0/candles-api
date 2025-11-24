import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // LINK TO USER (Mandatory: No anonymous checkout)
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      // SNAPSHOTS
      // We store the full address object here as JSON so if the user
      // changes their address later, this order history remains accurate.
      table.json('shipping_address').notNullable()

      // Order Details
      table.decimal('total_amount', 10, 2).notNullable()
      table.string('status').defaultTo('pending') // pending, paid, shipped, cancelled

      // Payment intent ID (Stripe) - Optional but recommended for later
      table.string('payment_intent_id').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
