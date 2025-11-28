import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Import Controllers lazily
const ProductsController = () => import('#controllers/products_controller')
const OrdersController = () => import('#controllers/orders_controller')
const AdminInventoryController = () => import('#controllers/admin_inventory_controller')
const PaymentController = () => import('#controllers/payment_controller')
const StripeWebhookController = () => import('#controllers/stripe_webhook_controller')

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
    router.post('/create-payment-intent', [PaymentController, 'createIntent'])

    // Stripe webhook
    router.post('/stripe-webhook', [StripeWebhookController, 'handle'])

    // Protected Routes (User must be logged in)
    router
      .group(() => {
        router.post('/admin/inventory/adjust', [AdminInventoryController, 'adjust'])
      })
      .use(middleware.auth()) // <--- This ensures auth.user is populated
  })
  .prefix('api') // All routes will start with /api

router.get('/', () => {
  return { hello: 'world' }
})
