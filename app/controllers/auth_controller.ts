import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  /**
   * POST /api/login
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      const user = await User.verifyCredentials(email, password)

      // Create a token
      const token = await User.accessTokens.create(user)

      return response.ok({
        token: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          roles: user.roles, // Important for frontend to know if they are admin
        },
      })
    } catch (error) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }
  }

  /**
   * GET /api/auth/me
   * Check current session
   */
  async me({ auth, response }: HttpContext) {
    await auth.check()
    const user = auth.user!
    return response.ok({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      roles: user.roles,
    })
  }
}
