import { Container, Item, PackingService as BinPacker } from '3d-bin-packing-ts'
import Product from '#models/product'

// Define a type for your box definition
type BoxDefinition = {
  name: string
  length: number // cm
  width: number // cm
  height: number // cm
  maxWeight: number // kg
  volume: number // helper for sorting
}

export default class PackagingService {
  // 1. Define your standard boxes (Internal Dimensions)
  private availableBoxes: BoxDefinition[] = [
    { name: 'Small Box', length: 20, width: 15, height: 15, maxWeight: 2, volume: 4500 },
    { name: 'Medium Box', length: 30, width: 25, height: 20, maxWeight: 5, volume: 15000 },
    { name: 'Large Box', length: 40, width: 40, height: 40, maxWeight: 10, volume: 64000 },
  ]

  constructor() {
    // Ensure boxes are sorted by volume (Smallest -> Largest)
    this.availableBoxes.sort((a, b) => a.volume - b.volume)
  }

  /**
   * Finds the smallest single box that fits all items.
   */
  public findBestBox(cartItems: { product: Product; quantity: number }[]) {
    // 1. Calculate Total Weight (Simple sum)
    const totalWeight = cartItems.reduce(
      (sum, item) => sum + Number(item.product.weight) * item.quantity,
      0
    )

    // 2. Create Library Items
    // The library Item constructor: (id, dim1, dim2, dim3, quantity)
    const itemsToPack = cartItems.map(({ product, quantity }) => {
      return new Item(
        product.name,
        Number(product.length),
        Number(product.width),
        Number(product.height),
        quantity // The library handles quantity logic internally
      )
    })

    // 3. Iterate through boxes to find the first fit
    for (const box of this.availableBoxes) {
      // A. Check Weight Limit first (Fastest check)
      if (totalWeight > box.maxWeight) {
        continue
      }

      // B. Create Container Object
      // Constructor: (id, length, width, height)
      const container = new Container(box.name, box.length, box.width, box.height)

      // C. Run 3D Packing
      const result = BinPacker.packSingle(container, itemsToPack)

      // The result contains an array of algorithm results (usually just one if default config)
      // We check if "isCompletePacked" is true
      const algorithmResult = result.algorithmPackingResults[0]

      if (algorithmResult && algorithmResult.isCompletePacked) {
        // SUCCESS: We found the smallest box that fits!
        return {
          length: box.length.toString(),
          width: box.width.toString(),
          height: box.height.toString(),
          distanceUnit: 'cm',
          weight: totalWeight.toString(),
          massUnit: 'kg',
        }
      }
    }

    // 4. Fallback (If nothing fits in a single box)
    // You might want to split shipment or return the largest box
    const largest = this.availableBoxes[this.availableBoxes.length - 1]
    return {
      length: largest.length.toString(),
      width: largest.width.toString(),
      height: largest.height.toString(),
      distanceUnit: 'cm',
      weight: totalWeight.toString(),
      massUnit: 'kg',
    }
  }
}
