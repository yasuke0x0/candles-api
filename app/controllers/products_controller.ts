import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'

export default class ProductsController {
  /**
   * Get all products
   * GET /products
   */
  public async index({ response }: HttpContext) {
    const products = await Product.query()
      .preload('discounts', (query) => {
        // Only load active discounts
        query.where('is_active', true)
      })
      .orderBy('name', 'asc')

    return response.ok(products)
  }

  /**
   * Get single product by ID
   * GET /products/:id
   */
  public async show({ params, response }: HttpContext) {
    try {
      const product = await Product.query()
        .where('id', params.id)
        .preload('discounts', (query) => {
          query.where('is_active', true)
        })
        .firstOrFail()

      return response.ok(product)
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }
}
