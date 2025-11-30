import InventoryService from '#services/inventory_service'
import { HttpContext } from '@adonisjs/core/http'
import HttpException from '#exceptions/http_exception'

export default class AdminInventoryController {
  private inventoryService = new InventoryService()

  public async adjust({ request, response, auth }: HttpContext) {
    const adminUser = auth.user!

    // Validate request
    const { productId, quantity, reason } = request.only(['productId', 'quantity', 'reason'])

    if (!productId || quantity === undefined) {
      throw new HttpException({
        message: 'Product ID and Quantity are required',
        status: 400,
      })
    }

    try {
      const updatedProduct = await this.inventoryService.adjustStock(
        productId,
        quantity, // Can be positive (restock) or negative (shrinkage/correction)
        'MANUAL_ADJUSTMENT',
        {
          userId: adminUser.id,
          reason: reason || 'Manual Admin Adjustment',
        }
      )

      return response.ok({
        message: 'Stock updated successfully',
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          newStock: updatedProduct.stock,
        },
      })
    } catch (error) {
      // Re-throw custom exceptions
      if (error instanceof HttpException) {
        throw error
      }

      // Handle unexpected errors
      throw new HttpException({
        message: error.message || 'Failed to adjust stock',
        status: 400,
      })
    }
  }
}
