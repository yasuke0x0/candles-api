import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('name').notNullable()
      table.text('description').nullable()
      table.decimal('price', 12, 2).notNullable()
      table.string('image').nullable()
      table.string('burn_time').nullable()
      table.boolean('is_new').defaultTo(false)
      table.json('scent_notes').nullable()

      // --- FIX: Added Stock Column Here ---
      table.integer('stock').unsigned().defaultTo(0).notNullable()
      // ------------------------------------

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
