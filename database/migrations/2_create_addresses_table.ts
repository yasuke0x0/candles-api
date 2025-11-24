import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign Key: Links address to a specific User
      // onDelete('CASCADE') means if User is deleted, their addresses are also deleted
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')

      table.string('recipient_name').notNullable() // e.g., "John Doe"
      table.string('street_address').notNullable()
      table.string('city').notNullable()
      table.string('postal_code').notNullable()
      table.string('country').defaultTo('France')

      // Optional: Label like "Home", "Work"
      table.string('label').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
