import {
  DistanceUnitEnum,
  ServiceLevelChronopostEnum,
  ServiceLevelColissimoEnum,
  Shippo,
  WeightUnitEnum,
} from 'shippo'
import env from '#start/env'
import PackagingService from '#services/packaging_service'
import Product from '#models/product'
import HttpException from '#exceptions/http_exception'
import { ParcelCreateRequest } from 'shippo/src/models/components/parcelcreaterequest.js'

export default class ShippoService {
  private client: Shippo
  private packagingService = new PackagingService()

  private fromAddress = {
    name: env.get('SHIPPO_FROM_NAME'),
    company: env.get('SHIPPO_FROM_COMPANY'),
    street1: env.get('SHIPPO_FROM_STREET1'),
    city: env.get('SHIPPO_FROM_CITY'),
    zip: env.get('SHIPPO_FROM_ZIP'),
    country: env.get('SHIPPO_FROM_COUNTRY'),
    phone: env.get('SHIPPO_FROM_PHONE'),
    email: env.get('SHIPPO_FROM_EMAIL'),
  }

  constructor() {
    this.client = new Shippo({
      apiKeyHeader: env.get('SHIPPO_API_TOKEN'),
    })
  }

  public async getShippingRate(toAddress: any, items: { id: number; quantity: number }[]) {
    if (toAddress.country !== 'France') {
      throw new HttpException({ message: 'Shipping is only supported in France', status: 400 })
    }

    try {
      // 1. Fetch Products
      const productIds = items.map((i) => i.id)
      const products = await Product.query().whereIn('id', productIds)

      // 2. Prepare for Packer
      const productsToPack = items
        .map((item) => {
          const product = products.find((p) => p.id === item.id)
          if (!product) return null
          return { product, quantity: item.quantity }
        })
        .filter((item) => item !== null) as { product: Product; quantity: number }[]

      // 3. Optimize Box
      const optimizedBox = this.packagingService.findBestBox(productsToPack)

      // 4. Create Parcel Object
      const parcel: ParcelCreateRequest = {
        length: optimizedBox.length,
        width: optimizedBox.width,
        height: optimizedBox.height,
        distanceUnit: DistanceUnitEnum.Cm,
        weight: optimizedBox.weight,
        massUnit: WeightUnitEnum.Kg,
      }

      // 5. Create Shipment
      const shipment = await this.client.shipments.create({
        addressFrom: this.fromAddress,
        addressTo: {
          name: `${toAddress.firstName} ${toAddress.lastName}`,
          street1: toAddress.address,
          city: toAddress.city,
          zip: toAddress.zip,
          country: 'FR',
          email: toAddress.email,
        },
        parcels: [parcel],
        async: false,
      })

      const rates = shipment.rates

      if (!rates || rates.length === 0) {
        console.error('No rates found from Shippo.')
        throw new HttpException({ message: 'Could not calculate the shipping rate', status: 400 })
      }

      // 6. FILTER: Strict Token-Based Logic
      const filteredRates = rates.filter((rate: any) => {
        const token = rate.servicelevel?.token

        // Safety check: if no token, skip
        if (!token) return false

        // Logic A: Colissimo -> ONLY 'colissimo_home'
        if (token.startsWith('colissimo')) {
          return token === ServiceLevelColissimoEnum.ColissimoHome
        }

        // Logic B: Chronopost -> ALL EXCEPT 'chronopost_relais_fr'
        if (token.startsWith('chronopost')) {
          return token !== ServiceLevelChronopostEnum.ChronopostRelaisFr
        }

        // Ignore all other providers (DHL, UPS, etc.)
        return false
      })

      if (filteredRates.length === 0) {
        console.warn('Rates found but filtered out based on service level restrictions.')
        throw new HttpException({
          message: 'No suitable home delivery options available for this address.',
          status: 400,
        })
      }

      // 7. Find the cheapest
      const sortedRates = filteredRates.sort(
        (a: any, b: any) => Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
      )
      const bestRate = sortedRates[0]

      return {
        cost: Number.parseFloat(bestRate.amount),
        currency: bestRate.currency,
        provider: bestRate.provider,
        service: bestRate.servicelevel?.name || bestRate.provider,
        estimatedDays: bestRate.estimatedDays,
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      console.error('Shippo API Error:', error)
      throw new HttpException({ message: 'Could not calculate the shipping rate', status: 400 })
    }
  }
}
