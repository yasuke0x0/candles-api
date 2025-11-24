import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Ensure these exist
      table.string('name').notNullable()
      table.text('description').nullable()
      table.decimal('price', 12, 2).notNullable() // or table.integer if using cents
      table.string('image').nullable()
      table.string('burn_time').nullable() // Note: DB columns usually snake_case
      table.boolean('is_new').defaultTo(false)
      table.json('scent_notes').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
