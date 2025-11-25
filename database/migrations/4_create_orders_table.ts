import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      // --- SNAPSHOTS ---
      // We store both addresses as JSON objects to preserve history
      table.json('shipping_address').notNullable()
      table.json('billing_address').notNullable() // <--- NEW

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
