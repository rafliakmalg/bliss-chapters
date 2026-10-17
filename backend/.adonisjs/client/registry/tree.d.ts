/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  accessTokens: {
    store: typeof routes['access_tokens.store']
    hint: typeof routes['access_tokens.hint']
    destroy: typeof routes['access_tokens.destroy']
  }
  profile: {
    show: typeof routes['profile.show']
  }
}
