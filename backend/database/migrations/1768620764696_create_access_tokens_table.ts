import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tabel bawaan @adonisjs/auth. Kolom diurutkan sesuai standar:
 * timestamp, ids, kolom lain (masing-masing alfabet).
 */
export default class extends BaseSchema {
  protected tableName = 'auth_access_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.timestamp('created_at', { useTz: true })
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.timestamp('last_used_at', { useTz: true }).nullable()
      table.timestamp('updated_at', { useTz: true })

      table.increments('id')
      table.integer('tokenable_id').notNullable().references('users.id').onDelete('CASCADE')

      table.text('abilities').notNullable()
      table.string('hash').notNullable()
      table.string('name').nullable()
      table.string('type').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
