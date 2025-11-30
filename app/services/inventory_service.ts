import db from '@adonisjs/lucid/services/db'
import Product from '#models/product'
import InventoryMovement from '#models/inventory_movement'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import HttpException from '#exceptions/http_exception'

export default class InventoryService {
  /**
   * Universal method to change stock.
   * Handles: Locking DB row, updating count, logging history.
   */
  public async adjustStock(
    productId: number,
    quantityDelta: number, // +10 (restock) or -5 (sale)
    type: 'SALE' | 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'DAMAGED',
    options: {
      userId?: number // Who did it?
      orderId?: number // Which order?
      reason?: string // Why?
      trx?: TransactionClientContract
    }
  ) {
    // Helper function to execute the logic
    const operation = async (trx: TransactionClientContract) => {
      // FIX: Updated type here
      // 1. Lock the product row to prevent race conditions
      const product = await Product.query({ client: trx })
        .where('id', productId)
        .forUpdate()
        .firstOrFail()

      // 2. Calculate new stock
      const newStock = product.stock + quantityDelta

      if (newStock < 0) {
        throw new HttpException({
          message: `Insufficient stock for Product #${productId} (${product.name}). Current: ${product.stock}, Requested: ${Math.abs(quantityDelta)}`,
          status: 400,
          code: 'E_INSUFFICIENT_STOCK',
        })
      }

      // 3. Update Product Cache
      product.stock = newStock
      await product.useTransaction(trx).save()

      // 4. Create Audit Log (Traceability)
      await InventoryMovement.create(
        {
          productId: product.id,
          userId: options.userId ?? null,
          orderId: options.orderId ?? null,
          quantity: quantityDelta,
          type: type,
          reason: options.reason ?? null,
          stockAfter: newStock,
        },
        { client: trx }
      )

      return product
    }

    // Execute within existing transaction or create a new managed one
    if (options.trx) {
      return await operation(options.trx)
    } else {
      return await db.transaction(operation)
    }
  }
}
