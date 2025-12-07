import Product from '#models/product'

export default class ProductService {
  /**
   * Public: List only ACTIVE products for storefront
   */
  public async getActive() {
    return Product.query()
      .where('status', 'ACTIVE')
      .preload('discounts', (q) => q.where('is_active', true))
      .orderBy('created_at', 'desc')
  }

  /**
   * Admin: List products with filters and pagination
   */
  public async list(filters: { status?: string; search?: string; page: number; limit: number }) {
    const query = Product.query().preload('discounts').orderBy('created_at', 'desc')

    // Filter by Status
    if (filters.status && filters.status !== 'ALL') {
      query.where('status', filters.status)
    }

    // Filter by Search (Name or ID)
    if (filters.search) {
      const term = `%${filters.search}%`
      query.where((group) => {
        group.where('name', 'like', term)
        group.orWhere('id', 'like', filters.search!.replace('#', '')) // Allow searching by ID
      })
    }

    return query.paginate(filters.page, filters.limit)
  }

  public async getById(id: number) {
    return Product.query()
      .where('id', id)
      .preload('discounts')
      .firstOrFail()
  }

  public async create(payload: any) {
    return Product.create({ ...payload, status: 'ACTIVE' })
  }

  public async update(id: number, payload: any) {
    const product = await Product.findOrFail(id)
    product.merge(payload)
    await product.save()
    return product
  }

  public async archive(id: number) {
    const product = await Product.findOrFail(id)
    product.status = 'ARCHIVED'
    await product.save()
    return product
  }

  // --- NEW: Restore Method ---
  public async restore(id: number) {
    const product = await Product.findOrFail(id)
    product.status = 'ACTIVE'
    await product.save()
    return product
  }
}
