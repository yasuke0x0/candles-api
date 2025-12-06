import type { HttpContext } from '@adonisjs/core/http'
import ProductService from '#services/product_service'
import { createProductValidator, updateProductValidator } from '#validators/products'

export default class ProductsController {
  private productService = new ProductService()

  /**
   * Public: List all products
   */
  public async index({ response }: HttpContext) {
    const products = await this.productService.getAll()
    return response.ok(products)
  }

  /**
   * Public: Get one
   */
  public async show({ params, response }: HttpContext) {
    try {
      const product = await this.productService.getById(params.id)
      return response.ok(product)
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }

  /**
   * Admin: Create Product
   */
  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createProductValidator)
    const product = await this.productService.create(payload)
    return response.created(product)
  }

  /**
   * Admin: Update Product
   */
  public async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateProductValidator)
    try {
      const product = await this.productService.update(params.id, payload)
      return response.ok(product)
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }

  /**
   * Admin: Delete Product
   */
  public async destroy({ params, response }: HttpContext) {
    try {
      await this.productService.delete(params.id)
      return response.noContent()
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }
}
