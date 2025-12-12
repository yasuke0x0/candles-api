import axios from 'axios'
import env from '#start/env'
import HttpException from '#exceptions/http_exception'

export default class GoogleMapsService {
  private apiKey = env.get('GOOGLE_MAPS_API_KEY')
  private baseUrl = 'https://places.googleapis.com/v1'

  /**
   * Fetch predictions using Places API (New)
   * Endpoint: POST /places:autocomplete
   */
  public async getPlacePredictions(input: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/places:autocomplete`,
        {
          input,
          // Restrict results to France ('fr')
          includedRegionCodes: ['fr'],
        },
        {
          headers: {
            'X-Goog-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      // Map the New API response format to your Frontend's expected format
      const suggestions = response.data.suggestions || []

      return suggestions.map((s: any) => ({
        description: s.placePrediction.text.text, // New API structure
        placeId: s.placePrediction.placeId,
      }))
    } catch (error) {
      console.error('Google Autocomplete Error:', error.response?.data || error.message)
      throw new HttpException({ message: 'Failed to fetch address suggestions', status: 500 })
    }
  }

  /**
   * Fetch address details using Places API (New)
   * Endpoint: GET /places/{placeId}
   */
  public async getPlaceDetails(placeId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/places/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          // Critical: You MUST specify fields in the new API to avoid being billed for everything
          'X-Goog-FieldMask': 'addressComponents',
        },
      })

      return this.formatAddressComponents(response.data.addressComponents)
    } catch (error) {
      console.error('Google Details Error:', error.response?.data || error.message)
      throw new HttpException({ message: 'Failed to fetch address details', status: 500 })
    }
  }

  /**
   * Helper to parse Google's component array into a flat object
   * Updated for Places API (New) -> uses 'longText' instead of 'long_name'
   */
  private formatAddressComponents(components: any[]) {
    const address = {
      streetNumber: '',
      route: '',
      city: '',
      zip: '',
      country: '',
    }

    if (!components) return address

    components.forEach((component) => {
      const types = component.types

      // Note: New API uses 'longText' property
      const value = component.longText

      if (types.includes('street_number')) {
        address.streetNumber = value
      }
      if (types.includes('route')) {
        address.route = value
      }
      if (types.includes('locality') || types.includes('postal_town')) {
        address.city = value
      }
      // Fallback for city if locality is missing
      if (!address.city && types.includes('administrative_area_level_1')) {
        address.city = value
      }
      if (types.includes('postal_code')) {
        address.zip = value
      }
      if (types.includes('country')) {
        address.country = value
      }
    })

    return {
      address: `${address.streetNumber} ${address.route}`.trim(),
      city: address.city,
      zip: address.zip,
      country: address.country,
    }
  }
}
