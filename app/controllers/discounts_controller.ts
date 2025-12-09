import type { HttpContext } from '@adonisjs/core/http'
import Discount from '#models/discount'

export default class DiscountsController {
  /**
   * List all discounts
   */
  public async index({ response }: HttpContext) {
    const discounts = await Discount.query().orderBy('createdAt', 'desc')
    return response.ok(discounts)
  }

  /**
   * Create a new discount
   */
  public async store({ request, response }: HttpContext) {
    const payload = request.only(['name', 'type', 'value', 'startsAt', 'endsAt', 'isActive'])

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
    if (!discount) {
      return response.notFound({ message: 'Discount not found' })
    }

    const payload = request.only(['name', 'type', 'value', 'startsAt', 'endsAt', 'isActive'])
    discount.merge(payload)
    await discount.save()

    return response.ok(discount)
  }

  /**
   * Delete a discount
   */
  public async destroy({ params, response }: HttpContext) {
    const discount = await Discount.find(params.id)
    if (!discount) {
      return response.notFound({ message: 'Discount not found' })
    }

    // Ensure database pivot table has ON DELETE CASCADE,
    // or manually detach if necessary: await discount.related('products').detach()
    await discount.delete()

    return response.noContent()
  }
}
