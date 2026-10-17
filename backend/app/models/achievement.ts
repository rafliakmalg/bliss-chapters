import { AchievementSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Event from '#models/event'

/** reward punya serializeAs: null; controller hanya mengirimnya kalau sudah unlocked. */
export default class Achievement extends AchievementSchema {
  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>
}
