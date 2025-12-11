import type { HttpContext } from '@adonisjs/core/http'
import ProductService from '#services/product_service'
import { createProductValidator, updateProductValidator } from '#validators/products'

export default class AdminProductsController {
  private productService = new ProductService()

  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status', 'ALL')
    const search = request.input('search')

    const products = await this.productService.list({ page, limit, status, search })
    return response.ok(products)
  }

  public async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createProductValidator)

    const discountId = request.input('discountId')

    const product = await this.productService.create(payload, discountId)

    return response.created(product)
  }

  public async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateProductValidator)

    const discountId = request.input('discountId')

    // Pass single ID to service
    const product = await this.productService.update(params.id, payload, discountId)

    return response.ok(product)
  }

  public async archive({ params, response }: HttpContext) {
    try {
      await this.productService.archive(params.id)
      return response.ok({ message: 'Product archived successfully' })
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }

  public async restore({ params, response }: HttpContext) {
    try {
      await this.productService.restore(params.id)
      return response.ok({ message: 'Product restored successfully' })
    } catch (error) {
      return response.notFound({ message: 'Product not found' })
    }
  }
}
