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
const AuthController = () => import('#controllers/auth_controller') // You likely need this for login

router
  .group(() => {
    // --- PUBLIC ROUTES ---

    // Auth
    router.post('/login', [AuthController, 'login'])

    // Shipping & Coupons
    router.post('/shipping/rates', [ShippingController, 'rates'])
    router.post('/coupons/check', [CouponsController, 'check'])

    // Products (Read-Only is Public)
    router.get('/products', [ProductsController, 'index'])
    router.get('/products/:id', [ProductsController, 'show'])

    // Orders & Payment
    router.post('/orders', [OrdersController, 'store'])
    router.post('/create-payment-intent', [PaymentController, 'createIntent'])
    router.post('/stripe-webhook', [StripeWebhookController, 'handle'])
    router.post('/users/save-contact', [UsersController, 'saveContact'])

    // --- PROTECTED ROUTES (Any Logged In User) ---
    router
      .group(() => {
        router.get('/auth/me', [AuthController, 'me']) // Get current user info
      })
      .use(middleware.auth())

    // --- ADMIN ROUTES (Super Admin Only) ---
    router
      .group(() => {
        // Product Management (CRUD)
        // These map to the methods we added to ProductsController
        router.post('/products', [ProductsController, 'store'])
        router.put('/products/:id', [ProductsController, 'update'])
        router.delete('/products/:id', [ProductsController, 'destroy'])

        // Inventory
        router.post('/inventory/adjust', [AdminInventoryController, 'adjust'])
      })
      .use(middleware.auth()) // Step 1: Log in (Populates ctx.auth.user - Must be logged in)
      .use(middleware.admin()) // Step 2: Check Role (Reads ctx.auth.user - Must be admin)
  })
  .prefix('api')

router.get('/', () => {
  return { hello: 'world' }
})
