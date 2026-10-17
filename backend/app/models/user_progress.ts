import { UserProgressSchema } from '#database/schema'
import { belongsTo, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Event from '#models/event'

export default class UserProgress extends UserProgressSchema {
  static table = 'user_progress'

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>

  @computed()
  get availablePoints() {
    return this.highScore - this.pointsSpent
  }
}
