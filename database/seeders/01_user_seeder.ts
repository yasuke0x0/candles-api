import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // 1. Create 5 ADMIN Accounts
    await User.updateOrCreateMany('email', [
      {
        email: 'admin@lumina.com',
        password: 'password123',
        firstName: 'Lumina',
        lastName: 'SuperAdmin',
        roles: ['SUPER_ADMIN'], // Valid
        newsletter: false,
      },
      {
        email: 'manager@lumina.com',
        password: 'password123',
        firstName: 'Sarah',
        lastName: 'Manager',
        roles: ['SUPER_ADMIN'],
        newsletter: true,
      },
      {
        email: 'support@lumina.com',
        password: 'password123',
        firstName: 'David',
        lastName: 'Support',
        roles: ['SUPER_ADMIN'],
        newsletter: false,
      },
      {
        email: 'logistics@lumina.com',
        password: 'password123',
        firstName: 'Mike',
        lastName: 'Logistics',
        roles: ['SUPER_ADMIN'],
        newsletter: false,
      },
      {
        email: 'finance@lumina.com',
        password: 'password123',
        firstName: 'Elena',
        lastName: 'Finance',
        roles: ['SUPER_ADMIN'],
        newsletter: false,
      },
    ])

    // 2. Create 20 Distinct Customers
    const customers = Array.from({ length: 20 }).map((_, index) => ({
      email: `customer${index + 1}@example.com`,
      password: 'password123',
      firstName: `Customer`,
      lastName: `${index + 1}`,
      // Explicitly cast this to the allowed union type array
      roles: ['CUSTOMER'] as ('SUPER_ADMIN' | 'CUSTOMER')[],
      newsletter: index % 2 === 0,
    }))

    await User.updateOrCreateMany('email', customers)

    console.log('✅ 5 Admins and 20 Customers seeded successfully')
  }
}
