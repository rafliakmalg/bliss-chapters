import { QuizSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Event from '#models/event'

/** correctOptionIndex punya serializeAs: null (schema_rules), tidak bocor ke client. */
export default class Quiz extends QuizSchema {
  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>
}
