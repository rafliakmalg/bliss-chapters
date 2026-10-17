import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'access_tokens.store': { paramsTuple?: []; params?: {} }
    'access_tokens.hint': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'access_tokens.destroy': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'access_tokens.store': { paramsTuple?: []; params?: {} }
    'access_tokens.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'access_tokens.hint': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'access_tokens.hint': { paramsTuple?: []; params?: {} }
    'profile.show': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}