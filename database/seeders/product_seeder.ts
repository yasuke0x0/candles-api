import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Product from '#models/product'

export default class extends BaseSeeder {
  async run() {
    // We use updateOrCreateMany to ensure we don't create duplicates
    // if the seeder is run multiple times.
    await Product.updateOrCreateMany('name', [
      {
        name: 'Midnight Amber',
        description:
          'A warm, resinous blend of amber, sandalwood, and a touch of vanilla orchid. Perfect for cozy evenings.',
        price: 32,
        vatRate: 20.0,
        priceNet: 26.67,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Amber', 'Sandalwood', 'Vanilla'],
        burnTime: '45-50 hours',
        isNew: true,
        stock: 50,
      },
      {
        name: 'Sage & Sea Salt',
        description:
          'Fresh oceanic breeze meeting the earthy aroma of wild sage. Invigorating and clean.',
        price: 28,
        vatRate: 20.0,
        priceNet: 23.33,
        image:
          'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Sea Salt', 'Sage', 'Driftwood'],
        burnTime: '40-45 hours',
        isNew: false,
        stock: 50,
      },
      {
        name: 'Lavender Haze',
        description:
          'French lavender essential oil blended with eucalyptus for a spa-like experience.',
        price: 30,
        vatRate: 20.0,
        priceNet: 25.0,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Lavender', 'Eucalyptus', 'White Tea'],
        burnTime: '45-50 hours',
        isNew: false,
        stock: 50,
      },
      {
        name: 'Cedar & Tobacco',
        description:
          'A masculine, sophisticated scent with notes of cured tobacco leaf, cedarwood, and leather.',
        price: 34,
        vatRate: 20.0,
        priceNet: 28.33,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Tobacco', 'Cedar', 'Leather'],
        burnTime: '50-55 hours',
        isNew: false,
        stock: 50,
      },
      {
        name: 'Golden Pear',
        description:
          'Sweet ripened pears simmered in brandy and spices. A holiday favorite available year-round.',
        price: 28,
        vatRate: 20.0,
        priceNet: 23.33,
        image:
          'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Pear', 'Cinnamon', 'Brandy'],
        burnTime: '40-45 hours',
        isNew: false,
        stock: 50,
      },
      {
        name: 'White Tea & Ginger',
        description: 'Delicate white tea leaves with a zest of ginger and lemon.',
        price: 30,
        vatRate: 20.0,
        priceNet: 25.0,
        image:
          'https://images.unsplash.com/photo-1596433809252-260c2745dfdd?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['White Tea', 'Ginger', 'Lemon'],
        burnTime: '45-50 hours',
        isNew: false,
        stock: 50,
      },
    ])
  }
}
