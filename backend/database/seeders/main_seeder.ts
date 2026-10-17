import { readFile } from 'node:fs/promises'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

/**
 * Seed dari database/data/mock_data.json (snake_case = nama kolom).
 * Pakai bersama `node ace migration:fresh --seed`.
 */
export default class extends BaseSeeder {
  async run() {
    const data = JSON.parse(await readFile(new URL('../data/mock_data.json', import.meta.url), 'utf8'))
    const { passcode, login_hints: loginHints, ...user } = data.user

    await db.transaction(async (trx) => {
      await trx.table('users').insert({
        ...user,
        password: await hash.make(passcode),
        login_hints: JSON.stringify(loginHints),
      })

      for (const { quizzes, coupons, achievements, ...event } of data.events) {
        const [{ id: eventId }] = await trx.table('events').returning('id').insert(event)

        await trx
          .table('quizzes')
          .multiInsert(quizzes.map((q: any) => ({ ...q, event_id: eventId, options: JSON.stringify(q.options) })))
        await trx.table('coupons').multiInsert(coupons.map((c: any) => ({ ...c, event_id: eventId })))
        await trx
          .table('achievements')
          .multiInsert(achievements.map((a: any) => ({ ...a, event_id: eventId, reward: JSON.stringify(a.reward) })))
      }
    })
  }
}
