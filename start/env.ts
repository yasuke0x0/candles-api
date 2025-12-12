/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  STRIPE_SECRET_KEY: Env.schema.string(),
  STRIPE_WEBHOOK_SECRET: Env.schema.string(),
  SHIPPO_API_TOKEN: Env.schema.string(),
  SHIPPO_FROM_NAME: Env.schema.string(),
  SHIPPO_FROM_COMPANY: Env.schema.string(),
  SHIPPO_FROM_STREET1: Env.schema.string(),
  SHIPPO_FROM_CITY: Env.schema.string(),
  SHIPPO_FROM_ZIP: Env.schema.string(),
  SHIPPO_FROM_COUNTRY: Env.schema.string(),
  SHIPPO_FROM_PHONE: Env.schema.string(),
  SHIPPO_FROM_EMAIL: Env.schema.string(),
})
