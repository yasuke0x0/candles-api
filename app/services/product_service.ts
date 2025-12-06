import Product from '#models/product'

export default class ProductService {
  public async getAll() {
    return Product.query()
      .preload('discounts', (q) => q.where('is_active', true))
      .orderBy('created_at', 'desc')
  }

  public async getById(id: number) {
    return Product.query()
      .where('id', id)
      .preload('discounts', (q) => q.where('is_active', true))
      .firstOrFail()
  }

  public async create(payload: any) {
    const product = await Product.create(payload)
    return product
  }

  public async update(id: number, payload: any) {
    const product = await Product.findOrFail(id)
    product.merge(payload)
    await product.save()
    return product
  }

  public async delete(id: number) {
    const product = await Product.findOrFail(id)
    await product.delete()
    return true
  }
}
