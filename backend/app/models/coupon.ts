import { CouponSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Event from '#models/event'
import UserCoupon from '#models/user_coupon'

export default class Coupon extends CouponSchema {
  @belongsTo(() => Event)
  declare event: BelongsTo<typeof Event>

  @hasMany(() => UserCoupon)
  declare redemptions: HasMany<typeof UserCoupon>
}
