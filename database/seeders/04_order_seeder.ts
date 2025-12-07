import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Order from '#models/order'
import User from '#models/user'
import Product from '#models/product'
import Address from '#models/address'
import Coupon from '#models/coupon'
import OrderItem from '#models/order_item'

export default class extends BaseSeeder {
  async run() {
    // 1. Fetch Dependencies & Preload Addresses
    const users = await User.query().where('email', 'not like', '%@lumina.com').preload('addresses')

    const products = await Product.all()
    const coupons = await Coupon.all()

    if (users.length === 0 || products.length === 0) {
      console.log('⚠️ Skipping Order Seeder: Users or Products missing.')
      return
    }

    console.log(`Checking addresses for ${users.length} users...`)

    // 2. Ensure ALL users have addresses first
    for (const user of users) {
      const hasShipping = user.addresses.some((a) => a.type === 'SHIPPING')
      const hasBilling = user.addresses.some((a) => a.type === 'BILLING')

      if (!hasShipping) {
        await Address.create({
          userId: user.id,
          type: 'SHIPPING',
          firstName: user.firstName,
          lastName: user.lastName,
          streetAddressLineOne: `${Math.floor(Math.random() * 1000)} Random St`,
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        })
      }

      if (!hasBilling) {
        await Address.create({
          userId: user.id,
          type: 'BILLING',
          firstName: user.firstName,
          lastName: user.lastName,
          streetAddressLineOne: `${Math.floor(Math.random() * 1000)} Random St`,
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        })
      }
    }

    // Refresh users to capture new addresses
    const readyUsers = await User.query()
      .where('email', 'not like', '%@lumina.com')
      .preload('addresses')

    // 3. Distribute 500 Orders (40% Frequent Buyers / 60% Occasional)
    console.log('Generating distribution for 500 orders...')
    const TOTAL_ORDERS = 500

    // Shuffle users to randomize who gets to be a "Frequent Buyer"
    const shuffledUsers = readyUsers.sort(() => 0.5 - Math.random())

    // Split: 40% Frequent, 60% Occasional
    const splitIndex = Math.floor(shuffledUsers.length * 0.4)
    const frequentBuyers = shuffledUsers.slice(0, splitIndex)
    const occasionalBuyers = shuffledUsers.slice(splitIndex)

    // A. Assign small number of orders to Occasional buyers (1 to 3 orders)
    let assignedOrdersCount = 0
    const orderQueue: User[] = []

    occasionalBuyers.forEach((user) => {
      const count = Math.floor(Math.random() * 3) + 1 // 1-3 orders
      for (let k = 0; k < count; k++) {
        orderQueue.push(user)
      }
      assignedOrdersCount += count
    })

    // B. Distribute remaining orders among Frequent buyers
    const remainingOrders = TOTAL_ORDERS - assignedOrdersCount
    if (frequentBuyers.length > 0) {
      for (let k = 0; k < remainingOrders; k++) {
        // Round-robin distribution to ensure even spread among frequent buyers
        const user = frequentBuyers[k % frequentBuyers.length]
        orderQueue.push(user)
      }
    }

    // C. Shuffle the queue so created dates and order IDs are mixed
    const finalQueue = orderQueue.sort(() => 0.5 - Math.random())

    console.log(`Prepared ${finalQueue.length} orders.`)
    console.log(`- ${frequentBuyers.length} Frequent Buyers (Heavy load)`)
    console.log(`- ${occasionalBuyers.length} Occasional Buyers (1-3 orders)`)

    // 4. Execute Order Creation
    const statuses = [
      'canceled',
      'created',
      'partially_funded',
      'payment_failed',
      'processing',
      'requires_action',
      'succeeded',
      'READY_TO_SHIP',
      'SHIPPED',
    ]

    for (let i = 0; i < finalQueue.length; i++) {
      const user = finalQueue[i]

      // Random Status
      const randomStatus = this.getRandom(statuses)

      // 25% chance of using a coupon
      const shouldUseCoupon = Math.random() > 0.75
      const randomCoupon = shouldUseCoupon ? this.getRandom(coupons) : undefined

      // Pick Random Products (1 to 5 items)
      const itemCount = Math.floor(Math.random() * 5) + 1
      const orderItemsRaw = []

      for (let j = 0; j < itemCount; j++) {
        const product = this.getRandom(products)
        orderItemsRaw.push({
          product: product,
          quantity: Math.floor(Math.random() * 3) + 1, // 1-3 qty
        })
      }

      // Random Date (Spread over last 6 months)
      const daysAgo = Math.floor(Math.random() * 180)
      const randomDate = DateTime.now().minus({ days: daysAgo })

      // Get Addresses (from preload)
      const shippingAddr = user.addresses.find((a) => a.type === 'SHIPPING')
      const billingAddr = user.addresses.find((a) => a.type === 'BILLING')

      if (!shippingAddr || !billingAddr) continue

      await this.createOrder({
        user: user,
        shippingAddr,
        billingAddr,
        status: randomStatus,
        items: orderItemsRaw,
        shippingCost: 15.0,
        coupon: randomCoupon,
        createdAt: randomDate,
      })

      if ((i + 1) % 50 === 0) console.log(`  ...seeded ${i + 1} / ${finalQueue.length} orders`)
    }

    console.log(`✅ ${finalQueue.length} Orders seeded successfully`)
  }

  /**
   * Helper: Get random element from array
   */
  getRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
  }

  /**
   * Helper to Create Order + Items
   */
  async createOrder({
    user,
    shippingAddr,
    billingAddr,
    status,
    items,
    shippingCost,
    coupon,
    createdAt,
  }: {
    user: User
    shippingAddr: Address
    billingAddr: Address
    status: string
    items: { product: Product; quantity: number }[]
    shippingCost: number
    coupon?: Coupon
    createdAt?: DateTime
  }) {
    // 1. Calculate Items Totals
    let subtotalNet = 0
    let totalVat = 0
    let itemsTotalGross = 0

    const orderItemsData = items.map((item) => {
      const p = item.product
      const qty = item.quantity
      const priceGross = Number(p.price)
      const vatRate = Number(p.vatRate)

      const priceNet = priceGross / (1 + vatRate / 100)
      const vatAmountPerUnit = priceGross - priceNet

      const lineTotalGross = priceGross * qty
      const lineTotalNet = priceNet * qty
      const lineTotalVat = vatAmountPerUnit * qty

      subtotalNet += lineTotalNet
      totalVat += lineTotalVat
      itemsTotalGross += lineTotalGross

      return {
        productId: p.id,
        productName: p.name,
        quantity: qty,
        price: priceGross,
        priceNet: Number(priceNet.toFixed(2)),
        vatRate: vatRate,
        vatAmount: Number(lineTotalVat.toFixed(2)),
        totalPrice: Number(lineTotalGross.toFixed(2)),
        discountAmount: 0,
        discountDescription: null,
      }
    })

    // 2. Calculate Coupon Discount
    let couponDiscount = 0
    if (coupon && coupon.isActive) {
      if (itemsTotalGross >= coupon.minOrderAmount) {
        if (coupon.type === 'PERCENTAGE') {
          couponDiscount = itemsTotalGross * (coupon.value / 100)
        } else {
          couponDiscount = coupon.value
        }
      }
    }

    if (couponDiscount > itemsTotalGross) {
      couponDiscount = itemsTotalGross
    }

    // 3. Final Order Totals
    const totalAmount = itemsTotalGross + shippingCost - couponDiscount

    // 4. Create Order
    const order = await Order.create({
      userId: user.id,
      shippingAddressId: shippingAddr.id,
      billingAddressId: billingAddr.id,
      status: status,
      paymentIntentId: ['succeeded', 'SHIPPED', 'READY_TO_SHIP'].includes(status)
        ? `pi_mock_${Math.random().toString(36).substr(7)}`
        : null,
      amountWithoutVat: Number(subtotalNet.toFixed(2)),
      vatAmount: Number(totalVat.toFixed(2)),
      shippingAmount: shippingCost,
      totalDiscount: Number(couponDiscount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      couponId: coupon?.id || null,
      couponDiscountAmount: Number(couponDiscount.toFixed(2)),
      createdAt: createdAt,
    })

    // 5. Create Order Items
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        ...itemData,
      })
    }
  }
}
