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
    // 1. Validate Product Data
    const payload = await request.validateUsing(createProductValidator)

    // 2. Extract Discount IDs (Not in validator main schema usually)
    const discountIds = request.input('discountIds', [])

    // 3. Create
    const product = await this.productService.create(payload)

    // 4. Sync Discounts (If provided)
    if (discountIds && Array.isArray(discountIds)) {
      await product.related('discounts').sync(discountIds)
      // Reload to return complete object
      await product.load('discounts')
    }

    return response.created(product)
  }

  /**
   * Admin: Update Product
   */
  public async update({ params, request, response }: HttpContext) {
    // 1. Validate
    const payload = await request.validateUsing(updateProductValidator)

    // 2. Extract Discounts
    const discountIds = request.input('discountIds', [])

    try {
      // 3. Update Product Fields
      const product = await this.productService.update(params.id, payload)

      // 4. Sync Discounts
      if (discountIds && Array.isArray(discountIds)) {
        await product.related('discounts').sync(discountIds)
        await product.load('discounts')
      }

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
