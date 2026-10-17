import limiter from '@adonisjs/limiter/services/main'

/**
 * Passcode pendek gampang di-brute-force, jadi login dibatasi per IP.
 */
export const loginThrottle = limiter.define('login', (ctx) => {
  return limiter.allowRequests(5).every('1 minute').usingKey(`login_${ctx.request.ip()}`)
})
