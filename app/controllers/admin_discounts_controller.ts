import type { HttpContext } from '@adonisjs/core/http'
import Discount from '#models/discount'
import { DateTime } from 'luxon'

export default class AdminDiscountsController {
  /**
   * List all discounts (excluding deleted ones)
   */
  public async index({ response }: HttpContext) {
    const discounts = await Discount.query()
      .whereNull('deletedAt')
      .orderBy('createdAt', 'desc')
    return response.ok(discounts)
  }

  /**
   * Create a new discount
   */
  public async store({ request, response }: HttpContext) {
    // Removed 'isActive' from payload
    const payload = request.only(['name', 'type', 'value', 'startsAt', 'endsAt'])

    // Basic Validation
    if (!payload.name || !payload.value || !payload.type) {
      return response.badRequest({ message: 'Name, Type, and Value are required.' })
    }

    const discount = await Discount.create(payload)
    return response.created(discount)
  }

  /**
   * Update a discount
   */
  public async update({ params, request, response }: HttpContext) {
    const discount = await Discount.find(params.id)

    // Check if not found or if it has been soft-deleted
    if (!discount || discount.deletedAt) {
      return response.notFound({ message: 'Discount not found or has been deleted' })
    }

    // Removed 'isActive' from payload
    const payload = request.only(['name', 'type', 'value', 'startsAt', 'endsAt'])
    discount.merge(payload)
    await discount.save()

    return response.ok(discount)
  }

  /**
   * Soft delete a discount
   */
  public async destroy({ params, response }: HttpContext) {
    const discount = await Discount.find(params.id)

    if (!discount || discount.deletedAt) {
      return response.notFound({ message: 'Discount not found' })
    }

    // Soft delete: Mark as deleted instead of removing row
    discount.deletedAt = DateTime.now()
    await discount.save()

    // Optional: You might want to detach products here depending on logic,
    // but keeping the relation history might be useful for analytics.
    // await discount.related('products').detach()

    return response.noContent()
  }
}
