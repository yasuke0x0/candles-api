import vine from '@vinejs/vine'

export const createProductValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3),
    description: vine.string().trim(),
    price: vine.number().min(0),
    vatRate: vine.number().min(0).max(100).optional(),
    stock: vine.number().min(0),

    // Dimensions for Shipping
    weight: vine.number().min(0), // kg
    length: vine.number().min(0), // cm
    width: vine.number().min(0),
    height: vine.number().min(0),

    // Metadata
    image: vine.string().url(),
    burnTime: vine.string().optional(),
    isNew: vine.boolean().optional(),
    scentNotes: vine.array(vine.string()).minLength(1),
  })
)

export const updateProductValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).optional(),
    description: vine.string().trim().optional(),
    price: vine.number().min(0).optional(),
    vatRate: vine.number().min(0).max(100).optional(),
    stock: vine.number().min(0).optional(),
    weight: vine.number().min(0).optional(),
    length: vine.number().min(0).optional(),
    width: vine.number().min(0).optional(),
    height: vine.number().min(0).optional(),
    image: vine.string().url().optional(),
    burnTime: vine.string().optional(),
    isNew: vine.boolean().optional(),
    scentNotes: vine.array(vine.string()).minLength(1).optional(),
  })
)
