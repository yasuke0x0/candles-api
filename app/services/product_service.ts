import Product from '#models/product'
import Discount from '#models/discount'
import DiscountHistory from '#models/discount_history'
import InventoryMovement from '#models/inventory_movement' // 1. Import Model
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
    const { discountId: excludedId, ...productData } = payload

    const product = await Product.create({
      ...productData,
      status: 'ACTIVE',
      discountId: null,
    })

    if (discountId !== undefined) {
      await this.syncDiscountAndLogHistory(product, discountId)
    }

    // Optional: Initial stock movement could be recorded here as RESTOCK if stock > 0
    if (product.stock > 0) {
      await InventoryMovement.create({
        productId: product.id,
        quantity: product.stock,
        type: 'RESTOCK',
        reason: 'Initial Stock',
        stockAfter: product.stock,
      })
    }

    return product
  }

  // 2. Updated Signature to accept userId
  public async update(id: number, payload: any, discountId?: number | null, userId?: number) {
    const product = await Product.findOrFail(id)
    const { discountId: excludedId, ...productData } = payload

    // 3. Capture Old Stock
    const previousStock = product.stock

    product.merge(productData)
    await product.save()

    // 4. Check for Manual Stock Adjustment
    // We check if stock is defined in payload and if it has actually changed
    if (productData.stock !== undefined && productData.stock !== previousStock) {
      const diff = productData.stock - previousStock

      await InventoryMovement.create({
        productId: product.id,
        userId: userId || null, // Track the admin
        quantity: diff, // Can be positive (add) or negative (remove)
        type: 'MANUAL_ADJUSTMENT',
        reason: 'Admin update via Product Form',
        stockAfter: product.stock,
      })
    }

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
    await product.load('discount')

    const currentDiscount = product.discount
    const currentId = product.discountId || null

    if (currentId === newDiscountId) {
      return
    }

    const nowSql = DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')

    if (currentDiscount) {
      await DiscountHistory.query()
        .where('product_id', product.id)
        .whereNull('removed_at')
        .update({ removed_at: nowSql })
    }

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
          appliedAt: DateTime.now(),
        })
      }
    }

    product.discountId = newDiscountId
    await product.save()
  }
}
