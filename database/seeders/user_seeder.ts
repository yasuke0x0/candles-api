import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // 1. Create the SUPER_ADMIN (You)
    await User.updateOrCreate(
      { email: 'admin@lumina.com' },
      {
        email: 'admin@lumina.com',
        password: 'password123', // Will be hashed by model hook or we hash it here if hook absent
        firstName: 'Lumina',
        lastName: 'Admin',
        roles: ['SUPER_ADMIN', 'CUSTOMER'], // Can buy and manage
        newsletter: false,
      }
    )

    // 2. Create some Customers
    await User.updateOrCreateMany('email', [
      {
        email: 'sophie@example.com',
        password: 'password123',
        firstName: 'Sophie',
        lastName: 'Martin',
        roles: ['CUSTOMER'],
        newsletter: true,
      },
      {
        email: 'lucas@example.com',
        password: 'password123',
        firstName: 'Lucas',
        lastName: 'Dubois',
        roles: ['CUSTOMER'],
        newsletter: false,
      },
    ])
  }
}
