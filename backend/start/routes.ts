/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Kontrak lengkap ada di docs/API.md. Endpoint game/kupon/achievement/admin
| ditambahkan di sini begitu controller-nya dibuat.
|
*/

import { middleware } from '#start/kernel'
import { loginThrottle } from '#start/limiter'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router
  .group(() => {
    router.post('login', [controllers.AccessTokens, 'store']).use(loginThrottle)
    router.get('login-hint', [controllers.AccessTokens, 'hint']).use(loginThrottle)

    router
      .group(() => {
        router.get('me', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .use(middleware.auth())
  })
  .prefix('/api')
