import { UserCouponSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Coupon from '#models/coupon'

/** Ada baris = sudah redeemed. evidencePhotoKey di-sign jadi URL saat response. */
export default class UserCoupon extends UserCouponSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Coupon)
  declare coupon: BelongsTo<typeof Coupon>
}
