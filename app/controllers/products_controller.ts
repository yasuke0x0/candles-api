import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'

export default class ProductsController {
  /**
   * Get all products
   * GET /products
   */
  public async index({ response }: HttpContext) {
    // Optional: Hide out-of-stock items if desired, or let frontend handle it
    const products = await Product.all()
    return response.ok(products)
  }

  /**
   * Get single product by ID
   * GET /products/:id
   */
  public async show({ params, response }: HttpContext) {
    try {
      const product = await Product.findOrFail(params.id)
      return response.ok(product)
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }

  /**
   * (Optional) Seed products for testing
   * POST /products/seed
   */
  public async seed({ response }: HttpContext) {
    // Prevent duplicate seeding
    const existing = await Product.first()
    if (existing) {
      return response.ok({ message: 'Products already seeded' })
    }

    const productsData = [
      {
        name: 'Midnight Amber',
        description:
          'A warm, resinous blend of amber, sandalwood, and a touch of vanilla orchid. Perfect for cozy evenings.',
        price: 32,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Amber', 'Sandalwood', 'Vanilla'],
        burnTime: '45-50 hours',
        isNew: true,
        stock: 50, // Added Stock
      },
      {
        name: 'Sage & Sea Salt',
        description:
          'Fresh oceanic breeze meeting the earthy aroma of wild sage. Invigorating and clean.',
        price: 28,
        image:
          'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Sea Salt', 'Sage', 'Driftwood'],
        burnTime: '40-45 hours',
        isNew: false,
        stock: 50, // Added Stock
      },
      {
        name: 'Lavender Haze',
        description:
          'French lavender essential oil blended with eucalyptus for a spa-like experience.',
        price: 30,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Lavender', 'Eucalyptus', 'White Tea'],
        burnTime: '45-50 hours',
        isNew: false,
        stock: 50, // Added Stock
      },
      {
        name: 'Cedar & Tobacco',
        description:
          'A masculine, sophisticated scent with notes of cured tobacco leaf, cedarwood, and leather.',
        price: 34,
        image:
          'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Tobacco', 'Cedar', 'Leather'],
        burnTime: '50-55 hours',
        isNew: false,
        stock: 50, // Added Stock
      },
      {
        name: 'Golden Pear',
        description:
          'Sweet ripened pears simmered in brandy and spices. A holiday favorite available year-round.',
        price: 28,
        image:
          'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['Pear', 'Cinnamon', 'Brandy'],
        burnTime: '40-45 hours',
        isNew: false,
        stock: 50, // Added Stock
      },
      {
        name: 'White Tea & Ginger',
        description: 'Delicate white tea leaves with a zest of ginger and lemon.',
        price: 30,
        image:
          'https://images.unsplash.com/photo-1596433809252-260c2745dfdd?auto=format&fit=crop&q=80&w=800',
        scentNotes: ['White Tea', 'Ginger', 'Lemon'],
        burnTime: '45-50 hours',
        isNew: false,
        stock: 50, // Added Stock
      },
    ]

    await Product.createMany(productsData)
    return response.created({ message: 'Products seeded successfully' })
  }
}
