import { DistanceUnitEnum, Shippo, WeightUnitEnum } from 'shippo'
import env from '#start/env'
import PackagingService from '#services/packaging_service'
import Product from '#models/product'

export default class ShippoService {
  private client: Shippo
  private packagingService = new PackagingService()

  // Warehouse / "From" Address
  private fromAddress = {
    name: 'Lumina Botanicals',
    company: 'Lumina HQ',
    street1: '8 rue berthy albrecht',
    city: 'Toulouse',
    zip: '31300',
    country: 'FR',
    phone: '+33123456789',
    email: 'orders@luminabotanicals.com',
  }

  constructor() {
    this.client = new Shippo({
      apiKeyHeader: env.get('SHIPPO_API_TOKEN'),
    })
  }

  /**
   * Calculates shipping rates based on cart items and destination.
   * Returns the CHEAPEST available rate.
   */
  public async getShippingRate(toAddress: any, items: { id: number; quantity: number }[]) {
    try {
      // 1. Fetch Real Product Dimensions from DB
      const productIds = items.map((i) => i.id)
      const products = await Product.query().whereIn('id', productIds)

      // 2. Prepare data for the 3D Packer
      const productsToPack = items
        .map((item) => {
          const product = products.find((p) => p.id === item.id)
          if (!product) return null
          return { product, quantity: item.quantity }
        })
        .filter((item) => item !== null) as { product: Product; quantity: number }[]

      // 3. Calculate the Perfect Box
      const optimizedBox = this.packagingService.findBestBox(productsToPack)

      // 4. Construct Shippo Parcel Object
      const parcel = {
        length: optimizedBox.length,
        width: optimizedBox.width,
        height: optimizedBox.height,
        distanceUnit: DistanceUnitEnum.Cm, // Using Enum for type safety
        weight: optimizedBox.weight,
        massUnit: WeightUnitEnum.Kg, // Using Enum for type safety
      }

      // 5. Create Shipment to get Rates
      // V2 SDK call
      const shipment = await this.client.shipments.create({
        addressFrom: this.fromAddress,
        addressTo: {
          name: `${toAddress.firstName} ${toAddress.lastName}`,
          street1: toAddress.address,
          city: toAddress.city,
          zip: toAddress.zip,
          country: toAddress.country === 'France' ? 'FR' : toAddress.country,
          email: toAddress.email,
        },
        parcels: [parcel],
        async: false, // Wait for rates immediately
      })

      // 6. Find the cheapest rate
      const rates = shipment.rates

      if (!rates || rates.length === 0) {
        console.warn('No rates found from Shippo, defaulting to flat rate.')
        return 7.9 // Fallback
      }

      // Sort by amount (ascending)
      const sortedRates = rates.sort(
        (a: any, b: any) => Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
      )
      const bestRate = sortedRates[0]

      // 7. Return Normalized Data
      return {
        cost: Number.parseFloat(bestRate.amount),
        currency: bestRate.currency,
        provider: bestRate.provider,
        service: bestRate.servicelevel?.name || bestRate.provider,
        estimatedDays: bestRate.estimatedDays,
      }
    } catch (error) {
      console.error('Shippo API Error:', error)
      // Return fallback rate if API fails (so the user can still checkout)
      return 7.9
    }
  }
}
