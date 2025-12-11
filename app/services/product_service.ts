import Product from '#models/product'
import Discount from '#models/discount'
import DiscountHistory from '#models/discount_history'
import { DateTime } from 'luxon'

export default class ProductService {
  public async getActive() {
    return Product.query()
      .where('status', 'ACTIVE')
      .preload('discount', (q) => q.whereNull('deletedAt'))
      .orderBy('createdAt', 'desc')
  }

  public async list(filters: { status?: string; search?: string; page: number; limit: number }) {
    const query = Product.query().preload('discount').orderBy('createdAt', 'desc')

    if (filters.status && filters.status !== 'ALL') {
      query.where('status', filters.status)
    }

    if (filters.search) {
      const term = `%${filters.search}%`
      query.where((group) => {
        group.where('name', 'like', term)
        group.orWhere('id', 'like', filters.search!.replace('#', ''))
      })
    }

    return query.paginate(filters.page, filters.limit)
  }

  public async getById(id: number) {
    return Product.query().where('id', id).preload('discount').firstOrFail()
  }

  public async create(payload: any, discountId?: number) {
    // Exclude discountId from initial payload
    const { discountId: excludedId, ...productData } = payload

    // 1. Create Product (Set discountId to null initially to avoid undefined errors)
    const product = await Product.create({
      ...productData,
      status: 'ACTIVE',
      discountId: null // Explicit null
    })

    // 2. Sync Discount if provided
    if (discountId !== undefined) {
      await this.syncDiscountAndLogHistory(product, discountId)
    }

    return product
  }

  public async update(id: number, payload: any, discountId?: number | null) {
    const product = await Product.findOrFail(id)
    const { discountId: excludedId, ...productData } = payload

    product.merge(productData)
    await product.save()

    if (discountId !== undefined) {
      await this.syncDiscountAndLogHistory(product, discountId)
    }

    return product
  }

  public async archive(id: number) {
    const product = await Product.findOrFail(id)
    product.status = 'ARCHIVED'
    await product.save()
    return product
  }

  public async restore(id: number) {
    const product = await Product.findOrFail(id)
    product.status = 'ACTIVE'
    await product.save()
    return product
  }

  private async syncDiscountAndLogHistory(product: Product, newDiscountId: number | null) {
    // Load current relationship safely
    await product.load('discount')

    const currentDiscount = product.discount
    const currentId = product.discountId || null

    if (currentId === newDiscountId) {
      return
    }

    // FIX 2: Use standard SQL format for MySQL compatibility
    const nowSql = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')

    // Close old history
    if (currentDiscount) {
      await DiscountHistory.query()
        .where('product_id', product.id)
        .whereNull('removed_at')
        .update({ removed_at: nowSql }) // Using formatted string
    }

    // Open new history
    if (newDiscountId) {
      const discount = await Discount.find(newDiscountId)
      if (discount) {
        const originalPrice = Number(product.price)
        let discountedPrice = originalPrice

        if (discount.type === 'PERCENTAGE') {
          discountedPrice = originalPrice * (1 - Number(discount.value) / 100)
        } else {
          discountedPrice = Math.max(0, originalPrice - Number(discount.value))
        }

        await DiscountHistory.create({
          productId: product.id,
          discountId: discount.id,
          discountName: discount.name,
          discountType: discount.type,
          discountValue: discount.value,
          originalPrice: originalPrice,
          discountedPrice: Number(discountedPrice.toFixed(2)),
          appliedAt: DateTime.now(), // Lucid handles creating from DateTime object correctly here
        })
      }
    }

    // Update Product
    product.discountId = newDiscountId
    await product.save()
  }
}
