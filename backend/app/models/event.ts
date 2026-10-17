import { EventSchema } from '#database/schema'
import { DateTime } from 'luxon'
import { computed, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Quiz from '#models/quiz'
import Coupon from '#models/coupon'
import Achievement from '#models/achievement'
import { type GameConfig, POINTS_PER_SECOND_LEFT } from '#services/scoring'

export default class Event extends EventSchema {
  @hasMany(() => Quiz)
  declare quizzes: HasMany<typeof Quiz>

  @hasMany(() => Coupon)
  declare coupons: HasMany<typeof Coupon>

  @hasMany(() => Achievement)
  declare achievements: HasMany<typeof Achievement>

  @computed()
  get isLocked() {
    return !this.active || (this.releaseDate !== null && this.releaseDate > DateTime.now())
  }

  get gameConfig(): GameConfig {
    return {
      timeLimitSeconds: this.timeLimitSeconds,
      timeBonusSeconds: this.timeBonusSeconds,
      timePenaltySeconds: this.timePenaltySeconds,
      pointsPerCorrect: this.pointsPerCorrect,
      passPercentage: this.passPercentage,
    }
  }

  /** Bentuk snake_case untuk response API (`game_config`). */
  @computed({ serializeAs: 'game_config' })
  get gameConfigJson() {
    return {
      time_limit_seconds: this.timeLimitSeconds,
      time_bonus_seconds: this.timeBonusSeconds,
      time_penalty_seconds: this.timePenaltySeconds,
      points_per_correct: this.pointsPerCorrect,
      pass_percentage: this.passPercentage,
      points_per_second_left: POINTS_PER_SECOND_LEFT,
    }
  }
}
