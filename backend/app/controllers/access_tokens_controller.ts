import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import { loginHintValidator, loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Single-user app: akun satu-satunya adalah baris hasil seed,
 * jadi login cukup passcode tanpa username.
 */
export default class AccessTokensController {
  async store({ request, response }: HttpContext) {
    const { passcode } = await request.validateUsing(loginValidator)
    const user = await User.query().firstOrFail()

    if (!(await hash.verify(user.password, passcode))) {
      return response.unauthorized({
        error: { code: 'WRONG_PASSCODE', message: 'Hmm, bukan itu sayang 🙈', hint_available: user.loginHints.length > 0 },
      })
    }

    const token = await User.accessTokens.create(user)
    return {
      user,
      token: { type: 'bearer', value: token.value!.release(), expires_at: token.expiresAt },
    }
  }

  async hint({ request }: HttpContext) {
    const { level = 1 } = await request.validateUsing(loginHintValidator, { data: request.qs() })
    const hints = (await User.query().firstOrFail()).loginHints
    const current = Math.min(level, hints.length)

    return {
      level: current,
      total_levels: hints.length,
      hint: hints[current - 1] ?? null,
      next_level: current < hints.length ? current + 1 : null,
    }
  }

  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    return { message: 'Logged out successfully' }
  }
}
