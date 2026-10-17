/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/login',
    tokens: [{"old":"/api/login","type":0,"val":"api","end":""},{"old":"/api/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['access_tokens.store']['types'],
  },
  'access_tokens.hint': {
    methods: ["GET","HEAD"],
    pattern: '/api/login-hint',
    tokens: [{"old":"/api/login-hint","type":0,"val":"api","end":""},{"old":"/api/login-hint","type":0,"val":"login-hint","end":""}],
    types: placeholder as Registry['access_tokens.hint']['types'],
  },
  'profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/me',
    tokens: [{"old":"/api/me","type":0,"val":"api","end":""},{"old":"/api/me","type":0,"val":"me","end":""}],
    types: placeholder as Registry['profile.show']['types'],
  },
  'access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/logout',
    tokens: [{"old":"/api/logout","type":0,"val":"api","end":""},{"old":"/api/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['access_tokens.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
