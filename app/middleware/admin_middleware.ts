import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    // 1. Check if logged in
    if (!user) {
      return ctx.response.unauthorized({ message: 'You must be logged in.' })
    }

    // 2. Check Role (Assuming 'roles' is a JSON array column on User)
    // Adjust this check based on how you store roles (string vs array)
    if (!user.roles || !user.roles.includes('SUPER_ADMIN')) {
      return ctx.response.forbidden({ message: 'Access denied. Admins only.' })
    }

    // 3. Proceed
    const output = await next()
    return output
  }
}
