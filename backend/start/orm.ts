import { BaseModel, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'

/**
 * Lucid 22 default-nya camelCase; kontrak API (docs/API.md) pakai snake_case.
 */
BaseModel.namingStrategy = new SnakeCaseNamingStrategy()
