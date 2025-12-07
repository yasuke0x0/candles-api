import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      // 1. Verify Credentials
      const user = await User.verifyCredentials(email, password)

      // 2. Create Token
      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: '7 days',
      })

      // 3. Return user data explicitly
      return response.ok({
        token: token, // This is an object: { type: 'bearer', token: 'xyz...', ... }
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles, // Used by frontend for guard
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
