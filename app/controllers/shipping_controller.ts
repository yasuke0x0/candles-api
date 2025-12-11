import type { HttpContext } from '@adonisjs/core/http'
import ShippoService from '#services/shippo_service'

export default class ShippingController {
  private shippoService = new ShippoService()

  /**
   * Endpoint: POST /api/shipping/rates
   * Usage: Fetch the live shipping rate for a given address and cart
   */
  public async rates({ request, response }: HttpContext) {
    // throw new HttpException({message: "nope"})
    // 1. Get data from frontend
    // Expects 'address' object and 'items' array
    const { address, items } = request.only(['address', 'items'])

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return response.badRequest({
        message: 'Address and non-empty items array are required.',
      })
    }

    // 2. Call the Service
    const rateData = await this.shippoService.getShippingRate(address, items)

    // 3. Normalize the response
    // The service might return a fallback number (7.90) or a detailed object
    if (typeof rateData === 'number') {
      return response.ok({
        cost: rateData,
        currency: 'EUR',
        estimatedDays: null,
        provider: 'Standard',
        isFallback: true,
      })
    }

    return response.ok({
      cost: rateData.cost,
      currency: rateData.currency,
      provider: rateData.provider,
      service: rateData.service,
      estimatedDays: rateData.estimatedDays,
      isFallback: false,
    })
  }
}
