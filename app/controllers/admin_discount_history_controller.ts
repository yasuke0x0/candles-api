import type { HttpContext } from '@adonisjs/core/http'
import DiscountHistory from '#models/discount_history'

export default class AdminDiscountHistoryController {
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const productId = request.input('productId')

    if (!productId) {
      return response.badRequest({ message: 'Product ID is required' })
    }

    const history = await DiscountHistory.query()
      .where('product_id', productId)
      .orderBy('appliedAt', 'desc')
      .paginate(page, limit)

    return response.ok(history)
  }
}
