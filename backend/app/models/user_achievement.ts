import { UserAchievementSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Achievement from '#models/achievement'
import GameSession from '#models/game_session'

export default class UserAchievement extends UserAchievementSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Achievement)
  declare achievement: BelongsTo<typeof Achievement>

  @belongsTo(() => GameSession)
  declare gameSession: BelongsTo<typeof GameSession>
}
