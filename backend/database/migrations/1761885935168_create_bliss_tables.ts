import { BaseSchema } from '@adonisjs/lucid/schema'
import type { Knex } from 'knex'

/**
 * Semua tabel BlissChapters. Timestamp file ini sengaja lebih awal dari
 * auth_access_tokens karena tabel itu mereferensikan `users`.
 *
 * Standar urutan kolom (masing-masing urut alfabet):
 *   1. timestamp  2. ids  3. kolom lain  4. status (tinyint 0/1, tanpa prefix is_)
 */
export default class extends BaseSchema {
  async up() {
    // Kolom timestamp tidak pakai table.timestamps() supaya bisa diurutkan alfabet
    const timestamp = (table: Knex.CreateTableBuilder, name: string, nullable = false) => {
      const column = table.timestamp(name, { useTz: true })
      return nullable ? column.nullable() : column.notNullable().defaultTo(this.now())
    }
    // Knex memetakan tinyint ke SMALLINT di Postgres; CHECK menjaga nilainya 0/1
    const status = (table: Knex.CreateTableBuilder, name: string, defaultValue?: 0 | 1) => {
      const column = table.tinyint(name).notNullable()
      if (defaultValue !== undefined) column.defaultTo(defaultValue)
      table.check(`${name} in (0, 1)`)
    }

    // 1. Single pre-seeded user (tidak ada registrasi publik)
    this.schema.createTable('users', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'updated_at')

      table.increments('id')

      table.string('display_name', 100).notNullable()
      table.jsonb('login_hints').notNullable().defaultTo('[]') // ["clue 1", "clue 2", ...] makin lama makin jelas
      table.string('password').notNullable() // hash scrypt dari passcode
      table.string('username', 50).notNullable().unique()
    })

    // 2. Chapters + konfigurasi time-attack per chapter
    this.schema.createTable('events', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'release_date', true) // null = langsung terbuka
      timestamp(table, 'updated_at')

      table.increments('id')

      table.integer('chapter_number').notNullable().unique()
      table.text('description').nullable()
      table.integer('pass_percentage').notNullable().defaultTo(60) // syarat "tamat"
      table.integer('points_per_correct').notNullable().defaultTo(100)
      table.string('slug', 100).notNullable().unique()
      table.integer('time_bonus_seconds').notNullable().defaultTo(3)
      table.integer('time_limit_seconds').notNullable().defaultTo(75)
      table.integer('time_penalty_seconds').notNullable().defaultTo(5)
      table.string('title', 150).notNullable()

      status(table, 'active', 1)

      table.check('time_limit_seconds between 30 and 300')
      table.check('pass_percentage between 0 and 100')
    })

    // 3. Bank soal per chapter
    this.schema.createTable('quizzes', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      table.integer('event_id').notNullable().references('events.id').onDelete('CASCADE').index()

      table.smallint('correct_option_index').notNullable() // TIDAK pernah dikirim ke client sebelum dijawab
      table.text('fun_fact').nullable()
      table.string('location_tag', 100).nullable()
      table.jsonb('options').notNullable() // ["Opsi A", "Opsi B", ...]
      table.text('question').notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)

      status(table, 'active', 1)

      table.check('correct_option_index >= 0 and correct_option_index < jsonb_array_length(options)')
    })

    // 4. Master kupon (dibeli pakai available_points chapter yang sama)
    this.schema.createTable('coupons', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      table.integer('event_id').notNullable().references('events.id').onDelete('CASCADE').index()

      table.text('description').nullable()
      table.string('icon_code', 50).nullable()
      table.integer('required_points').notNullable()
      table.string('title', 150).notNullable()

      status(table, 'active', 1)

      table.check('required_points > 0')
    })

    // 5. Master achievement. Maks 1 per trigger per chapter.
    this.schema.createTable('achievements', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      table.integer('event_id').notNullable().references('events.id').onDelete('CASCADE')

      table.string('badge_icon', 50).nullable()
      table.text('description').nullable()
      table.jsonb('reward').nullable() // { type, letter?, message?, photo_keys? } — disembunyikan sampai unlock
      table.string('title', 150).notNullable()
      table.enum('trigger_type', ['chapter_completion', 'perfect_score', 'first_try']).notNullable()

      table.unique(['event_id', 'trigger_type'])
    })

    // 6. Best score & spent points per user per chapter
    this.schema.createTable('user_progress', (table) => {
      timestamp(table, 'cleared_at', true)
      timestamp(table, 'created_at')
      timestamp(table, 'last_played_at', true)
      timestamp(table, 'updated_at')

      table.increments('id')
      table.integer('event_id').notNullable().references('events.id').onDelete('CASCADE')
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.integer('attempts_count').notNullable().defaultTo(0) // dipakai First Try
      table.integer('high_score').notNullable().defaultTo(0)
      table.integer('points_spent').notNullable().defaultTo(0)

      status(table, 'chapter_cleared', 0)

      table.unique(['user_id', 'event_id'])
      // available_points = high_score - points_spent tidak boleh minus, dijaga DB
      table.check('points_spent >= 0 and points_spent <= high_score')
    })

    // 7. Riwayat sesi. client_session_id unik = submit dobel (double tap / retry) tidak dihitung 2x
    this.schema.createTable('game_sessions', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      table.uuid('client_session_id').notNullable().unique()
      table.integer('event_id').notNullable().references('events.id').onDelete('CASCADE')
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.jsonb('answers').notNullable() // [{ quiz_id, selected_index, elapsed_ms, is_correct }]
      table.integer('correct_count').notNullable()
      table.integer('score').notNullable()
      table.integer('time_left_ms').notNullable()
      table.integer('total_questions').notNullable()

      status(table, 'cleared')
      status(table, 'perfect')

      table.index(['user_id', 'event_id'])
    })

    // 8. Kupon yang sudah di-redeem. Baris hanya ada saat redeemed; status locked/available dihitung.
    this.schema.createTable('user_coupons', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'redeemed_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      // RESTRICT: hapus chapter/kupon yang sudah punya foto kenangan harus gagal, bukan diam-diam hilang
      table.integer('coupon_id').notNullable().references('coupons.id').onDelete('RESTRICT')
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.string('evidence_photo_key').notNullable() // key di Drive, URL di-sign saat dibaca
      table.integer('points_spent').notNullable() // snapshot required_points saat redeem
      table.text('redeem_note').notNullable()

      table.unique(['user_id', 'coupon_id'])
    })

    // 9. Achievement yang sudah terbuka
    this.schema.createTable('user_achievements', (table) => {
      timestamp(table, 'created_at')
      timestamp(table, 'unlocked_at')
      timestamp(table, 'updated_at')

      table.increments('id')
      table.integer('achievement_id').notNullable().references('achievements.id').onDelete('CASCADE')
      table.integer('game_session_id').nullable().references('game_sessions.id').onDelete('SET NULL')
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')

      table.unique(['user_id', 'achievement_id'])
    })
  }

  async down() {
    for (const name of [
      'user_achievements',
      'user_coupons',
      'game_sessions',
      'user_progress',
      'achievements',
      'coupons',
      'quizzes',
      'events',
      'users',
    ]) {
      this.schema.dropTable(name)
    }
  }
}
