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

    // --- Discount A: Seasonal Sale (15% Off) ---
    const seasonalSale = await Discount.updateOrCreate(
      { name: 'Seasonal Sale' },
      {
        type: 'PERCENTAGE',
        value: 15,
        startsAt: DateTime.now().minus({ days: 1 }), // Started yesterday
        endsAt: DateTime.now().plus({ days: 14 }), // Ends in 2 weeks
      }
    )

    // Assign to first 2 products
    // Logic: Update the product's discountId directly
    const firstTwoIds = products.slice(0, 2).map((p) => p.id)
    await Product.query().whereIn('id', firstTwoIds).update({ discount_id: seasonalSale.id })

    // --- Discount B: Clearance Event (€5 Off) ---
    const clearance = await Discount.updateOrCreate(
      { name: 'Clearance Event' },
      {
        type: 'FIXED',
        value: 5.0,
        startsAt: DateTime.now(),
      }
    )

    // Assign to 3rd product
    if (products[2]) {
      const p3 = products[2]
      p3.discountId = clearance.id
      await p3.save()
    }

    // --- Discount C: Future Sale (Inactive) ---
    // We create this but don't assign it to active products to avoid conflict
    // (since a product can now only have ONE discountId)
    await Discount.updateOrCreate(
      { name: 'Black Friday Preview' },
      {
        type: 'PERCENTAGE',
        value: 25,
        startsAt: DateTime.now().plus({ months: 1 }),
      }
    )

    console.log('✅ Discounts seeded and assigned to products')
  }
}
