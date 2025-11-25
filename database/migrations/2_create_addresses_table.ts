import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE')

      // Address Fields
      table.string('street_address_line_one').notNullable()
      table.string('street_address_line_two').nullable()
      table.string('city').notNullable()
      table.string('postal_code').notNullable()
      table.string('country').defaultTo('France')

      // Type: 'shipping', 'billing', or 'both'
      table.string('type').defaultTo('shipping')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
