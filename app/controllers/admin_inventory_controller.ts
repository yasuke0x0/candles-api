import type { HttpContext } from '@adonisjs/core/http'
import InventoryMovement from '#models/inventory_movement'

export default class AdminInventoryController {
  public async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const type = request.input('type')
    const search = request.input('search')
    const productId = request.input('productId')

    const query = InventoryMovement.query()
      .preload('product')
      .preload('user')
      .preload('order')
      .orderBy('createdAt', 'desc')

    // Filter by Product ID (Specific Product History)
    if (productId) {
      query.where('product_id', productId)
    }

    if (type && type !== 'ALL') {
      query.where('type', type)
    }

    if (search) {
      query.whereHas('product', (q) => {
        q.where('name', 'like', `%${search}%`)
      }).orWhereHas('user', (q) => {
        q.where('email', 'like', `%${search}%`)
      })
    }

    const movements = await query.paginate(page, limit)

    return response.ok(movements)
  }
}
