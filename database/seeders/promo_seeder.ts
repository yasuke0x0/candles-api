import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Coupon from '#models/coupon'
import Discount from '#models/discount'
import Product from '#models/product'

export default class extends BaseSeeder {
  async run() {
    await this.seedCoupons()
    await this.seedDiscounts()
  }

  /**
   * 1. Seed Coupons (Global Cart Discounts)
   */
  async seedCoupons() {
    const now = DateTime.now()

    // Using updateOrCreateMany to avoid duplicates
    // We match against 'code'
    await Coupon.updateOrCreateMany('code', [
      {
        code: 'WELCOME10',
        description: '10% off your first order',
        type: 'PERCENTAGE',
        value: 10,
        isActive: true,
        maxUsesPerUser: 1,
        minOrderAmount: 0,
        currentUses: 0,
      },
      {
        code: 'SAVE20',
        description: '€20 off orders over €100',
        type: 'FIXED',
        value: 20,
        minOrderAmount: 100,
        isActive: true,
        maxUsesPerUser: 10,
        currentUses: 0,
      },
      {
        code: 'SUMMER50',
        description: '50% off - Limited to first 100 people',
        type: 'PERCENTAGE',
        value: 50,
        maxUses: 100,
        currentUses: 0,
        isActive: true,
        minOrderAmount: 0,
      },
      {
        code: 'VIPSECRET',
        description: 'Inactive/Secret coupon',
        type: 'PERCENTAGE',
        value: 30,
        isActive: false, // Manually disabled
        minOrderAmount: 0,
        currentUses: 0,
      },
      {
        code: 'EXPIRED',
        description: 'This coupon is old',
        type: 'FIXED',
        value: 5,
        isActive: true,
        endsAt: now.minus({ days: 1 }), // Ended yesterday
        minOrderAmount: 0,
        currentUses: 0,
      },
    ])

    console.log('✅ Coupons seeded successfully')
  }

  /**
   * 2. Seed Discounts (Product Specific Sales)
   */
  async seedDiscounts() {
    const products = await Product.all()

    if (products.length === 0) {
      console.log('⚠️ No products found. Skipping discount attachment.')
      return
    }

    // --- Discount A: 15% Off Selection (Percentage) ---
    const seasonalSale = await Discount.updateOrCreate(
      { name: 'Seasonal Sale' },
      {
        type: 'PERCENTAGE',
        value: 15,
        isActive: true,
        startsAt: DateTime.now().minus({ days: 1 }), // Started yesterday
        endsAt: DateTime.now().plus({ days: 14 }), // Ends in 2 weeks
      }
    )

    // Attach to the first 2 products (e.g., Midnight Amber, Sage & Sea Salt)
    // .attach() fills the 'product_discounts' pivot table
    const firstTwoProductIds = products.slice(0, 2).map((p) => p.id)
    await seasonalSale.related('products').sync(firstTwoProductIds)

    // --- Discount B: €5 Off Clearance (Fixed) ---
    const clearance = await Discount.updateOrCreate(
      { name: 'Clearance Event' },
      {
        type: 'FIXED',
        value: 5.0,
        isActive: true,
        startsAt: DateTime.now(),
      }
    )

    // Attach to the 3rd product (e.g., Lavender Haze)
    if (products[2]) {
      await clearance.related('products').sync([products[2].id])
    }

    // --- Discount C: Future Sale (Inactive) ---
    const futureSale = await Discount.updateOrCreate(
      { name: 'Black Friday Preview' },
      {
        type: 'PERCENTAGE',
        value: 25,
        isActive: false, // Not active yet
        startsAt: DateTime.now().plus({ months: 1 }),
      }
    )

    // Attach to all products
    const allIds = products.map((p) => p.id)
    await futureSale.related('products').sync(allIds)

    console.log('✅ Discounts seeded and attached to products')
  }
}
