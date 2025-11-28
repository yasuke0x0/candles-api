import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import string from '@adonisjs/core/helpers/string'

export default class UsersController {
  public async saveContact({ request, response }: HttpContext) {
    const { email, newsletter } = request.only(['email', 'newsletter'])

    if (!email) {
      return response.badRequest({ message: 'Email is required' })
    }

    try {
      let user = await User.findBy('email', email)

      if (!user) {
        // Create new user with random password (guest-like experience)
        user = await User.create({
          email,
          password: string.random(32),
          roles: ['CUSTOMER'],
          newsletter: !!newsletter,
        })

        return response.ok({ message: 'Contact info saved', userId: user.id })
      } else {
        // Update existing user's newsletter preference
        // We only update if it changed to avoid unnecessary writes
        if (newsletter !== undefined && user.newsletter !== newsletter) {
          user.newsletter = !!newsletter
          await user.save()
        }

        return response.ok({ message: 'Contact info updated', userId: user.id })
      }
    } catch (error) {
      return response.badRequest({ message: 'Failed to save contact info' })
    }
  }
}
