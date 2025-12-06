import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Import Controllers lazily
const ProductsController = () => import('#controllers/products_controller')
const OrdersController = () => import('#controllers/orders_controller')
const AdminInventoryController = () => import('#controllers/admin_inventory_controller')
const PaymentController = () => import('#controllers/payment_controller')
const StripeWebhookController = () => import('#controllers/stripe_webhook_controller')
const UsersController = () => import('#controllers/users_controller')
const CouponsController = () => import('#controllers/coupons_controller')
const ShippingController = () => import('#controllers/shipping_controller')

router
  .group(() => {
    // Shipping
    router.post('/shipping/rates', [ShippingController, 'rates'])

    // Coupons
    router.post('/coupons/check', [CouponsController, 'check'])

    // Product Routes
    router.get('/products', [ProductsController, 'index'])
    router.get('/products/:id', [ProductsController, 'show'])

    // Order Routes
    router.post('/orders', [OrdersController, 'store'])
    router.post('/create-payment-intent', [PaymentController, 'createIntent'])

    // Stripe webhook
    router.post('/stripe-webhook', [StripeWebhookController, 'handle'])

    // User
    router.post('/users/save-contact', [UsersController, 'saveContact'])

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
