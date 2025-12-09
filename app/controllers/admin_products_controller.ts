import type { HttpContext } from '@adonisjs/core/http'
import ProductService from '#services/product_service'
import { createProductValidator, updateProductValidator } from '#validators/products'

export default class AdminProductsController {
  private productService = new ProductService()

  /**
   * Admin: List products with pagination & status filters
   */
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status', 'ALL') // 'ACTIVE', 'ARCHIVED', or 'ALL'
    const search = request.input('search')

    const products = await this.productService.list({ page, limit, status, search })
    return response.ok(products)
  }

  /**
   * Admin: Create Product
   */
  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createProductValidator)
    const discountIds = request.input('discountIds', [])

    // CONSTRAINT: Limit to 1 discount per product
    if (Array.isArray(discountIds) && discountIds.length > 1) {
      return response.badRequest({
        message: 'A product can only have one active discount at a time.',
      })
    }

    const product = await this.productService.create(payload)

    if (discountIds && Array.isArray(discountIds)) {
      await product.related('discounts').sync(discountIds)
    }

    return response.created(product)
  }

  /**
   * Admin: Update Product
   */
  public async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateProductValidator)
    const discountIds = request.input('discountIds', [])

    // CONSTRAINT: Limit to 1 discount per product
    if (Array.isArray(discountIds) && discountIds.length > 1) {
      return response.badRequest({
        message: 'A product can only have one active discount at a time.',
      })
    }

    const product = await this.productService.update(params.id, payload)

    if (discountIds && Array.isArray(discountIds)) {
      await product.related('discounts').sync(discountIds)
    }

    return response.ok(product)
  }

  /**
   * Admin: Archive Product
   */
  public async archive({ params, response }: HttpContext) {
    try {
      await this.productService.archive(params.id)
      return response.ok({ message: 'Product archived successfully' })
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }

  /**
   * Admin: Restore Product
   */
  public async restore({ params, response }: HttpContext) {
    try {
      await this.productService.restore(params.id)
      return response.ok({ message: 'Product restored successfully' })
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }
}
