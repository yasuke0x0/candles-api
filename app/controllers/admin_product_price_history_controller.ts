import type { HttpContext } from '@adonisjs/core/http'
import ProductPriceHistory from '#models/product_price_history'

export default class AdminProductPriceHistoryController {
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const productId = request.input('productId')

    if (!productId) {
      return response.badRequest({ message: 'Product ID is required' })
    }

    const history = await ProductPriceHistory.query()
      .where('product_id', productId)
      .preload('user') // To show who changed it
      .orderBy('createdAt', 'desc')
      .paginate(page, limit)

    return response.ok(history)
  }
}
