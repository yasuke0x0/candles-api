import type { HttpContext } from '@adonisjs/core/http'
import ProductService from '#services/product_service'

export default class ProductsController {
  private productService = new ProductService()

  /**
   * Public: List only ACTIVE products
   */
  public async index({ response }: HttpContext) {
    const products = await this.productService.getActive()
    return response.ok(products)
  }

  /**
   * Public: Get details of a product
   */
  public async show({ params, response }: HttpContext) {
    try {
      const product = await this.productService.getById(params.id)

      return response.ok(product)
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }
}
