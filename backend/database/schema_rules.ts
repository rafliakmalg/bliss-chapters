import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * node-pg mengirim JS array sebagai Postgres array, bukan JSON,
 * jadi semua kolom jsonb di-stringify dulu.
 */
const jsonb = (tsType: string, extra: Record<string, unknown> = {}) => ({
  tsType,
  decorators: [
    {
      name: '@column',
      args: { prepare: (value: unknown) => (value === null ? null : JSON.stringify(value)), ...extra },
    },
  ],
})

/**
 * Kolom status disimpan tinyint 0/1 (standar DB), tapi di kode & API tetap boolean.
 */
const status = {
  tsType: 'boolean',
  decorators: [
    {
      name: '@column',
      args: { prepare: (value: unknown) => (value ? 1 : 0), consume: (value: unknown) => Boolean(value) },
    },
  ],
}

export default {
  types: { jsonb: jsonb('any') },
  columns: { active: status, chapter_cleared: status, cleared: status, perfect: status },
  tables: {
    users: { columns: { login_hints: jsonb('string[]', { serializeAs: null }) } },
    quizzes: {
      columns: {
        options: jsonb('string[]'),
        correct_option_index: { tsType: 'number', decorators: [{ name: '@column', args: { serializeAs: null } }] },
      },
    },
    achievements: {
      columns: {
        trigger_type: { tsType: "'chapter_completion' | 'perfect_score' | 'first_try'", decorators: [{ name: '@column' }] },
        // reward hanya boleh keluar lewat controller setelah achievement unlocked
        reward: jsonb(
          '{ type: string; letter?: string; message?: string; photo_keys?: string[] }',
          { serializeAs: null }
        ),
      },
    },
    game_sessions: {
      columns: {
        answers: jsonb('{ quiz_id: number; selected_index: number; elapsed_ms: number; is_correct: boolean }[]'),
      },
    },
  },
} satisfies SchemaRules
