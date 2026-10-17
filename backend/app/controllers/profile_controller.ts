import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth }: HttpContext) {
    return auth.getUserOrFail()
  }
}
