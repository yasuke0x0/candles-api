import router from '@adonisjs/core/services/router'

// Import Controllers lazily
const ProductsController = () => import('#controllers/products_controller')
const OrdersController = () => import('#controllers/orders_controller')

router
  .group(() => {
    // Health Check
    router.get('/', async () => {
      return { hello: 'world' }
    })

    // Product Routes
    router.get('/products', [ProductsController, 'index'])
    router.get('/products/:id', [ProductsController, 'show'])
    router.post('/products/seed', [ProductsController, 'seed']) // Helper to populate DB

    // Order Routes
    router.post('/orders', [OrdersController, 'store'])
  })
  .prefix('api') // All routes will start with /api

router.get('/', () => {
  return { hello: 'world' }
})
