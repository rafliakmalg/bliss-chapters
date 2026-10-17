import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { beforeSave, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import UserProgress from '#models/user_progress'
import UserCoupon from '#models/user_coupon'
import UserAchievement from '#models/user_achievement'

/**
 * Akun tunggal, login hanya pakai passcode (lihat AccessTokensController),
 * jadi mixin withAuthFinder (login by uid + password) tidak dipakai.
 */
export default class User extends UserSchema {
  static accessTokens = DbAccessTokensProvider.forModel(User, { expiresIn: '30 days' })
  declare currentAccessToken?: AccessToken

  @hasMany(() => UserProgress)
  declare progress: HasMany<typeof UserProgress>

  @hasMany(() => UserCoupon)
  declare coupons: HasMany<typeof UserCoupon>

  @hasMany(() => UserAchievement)
  declare achievements: HasMany<typeof UserAchievement>

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) user.password = await hash.make(user.password)
  }
}
