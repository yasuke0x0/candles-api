import type { HttpContext } from '@adonisjs/core/http'
import GoogleMapsService from '#services/google_maps_service'

export default class GoogleMapsController {
  private mapsService = new GoogleMapsService()

  public async autocomplete({ request, response }: HttpContext) {
    const input = request.input('input')
    if (!input) return response.badRequest({ message: 'Input is required' })

    const predictions = await this.mapsService.getPlacePredictions(input)
    return response.ok(predictions)
  }

  public async details({ request, response }: HttpContext) {
    const placeId = request.input('placeId')
    if (!placeId) return response.badRequest({ message: 'Place ID is required' })

    const details = await this.mapsService.getPlaceDetails(placeId)
    return response.ok(details)
  }
}
