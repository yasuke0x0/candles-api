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
const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    // --- PUBLIC ROUTES ---
    router.post('/login', [AuthController, 'login'])
    router.post('/shipping/rates', [ShippingController, 'rates'])

    // Public Coupon Check (for Cart)
    router.post('/coupons/check', [CouponsController, 'check'])

    router.get('/products', [ProductsController, 'index'])
    router.get('/products/:id', [ProductsController, 'show'])
    router.post('/orders', [OrdersController, 'store'])
    router.post('/create-payment-intent', [PaymentController, 'createIntent'])
    router.post('/stripe-webhook', [StripeWebhookController, 'handle'])
    router.post('/users/save-contact', [UsersController, 'saveContact'])

    // --- PROTECTED ROUTES ---
    router
      .group(() => {
        router.get('/auth/me', [AuthController, 'me'])
      })
      .use(middleware.auth())

    // --- ADMIN ROUTES (Super Admin Only) ---
    router
      .group(() => {
        // Products
        router.post('/products', [ProductsController, 'store'])
        router.put('/products/:id', [ProductsController, 'update'])
        router.delete('/products/:id', [ProductsController, 'destroy'])

        // Product Discounts (Renamed method to avoid conflict)
        router.get('/discounts', [CouponsController, 'listDiscounts'])

        // Coupons CRUD (Cart Codes)
        router.get('/coupons', [CouponsController, 'index'])
        router.post('/coupons', [CouponsController, 'store'])
        router.put('/coupons/:id', [CouponsController, 'update'])
        router.delete('/coupons/:id', [CouponsController, 'destroy'])

        // Inventory
        router.post('/inventory/adjust', [AdminInventoryController, 'adjust'])
      })
      .use(middleware.auth())
      .use(middleware.admin())
  })
  .prefix('api')

router.get('/', () => {
  return { hello: 'world' }
})
