import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Import Controllers lazily
const ProductsController = () => import('#controllers/products_controller')
const AdminProductsController = () => import('#controllers/admin_products_controller')
const AdminInventoryController = () => import('#controllers/admin_inventory_controller')
const PaymentController = () => import('#controllers/payment_controller')
const StripeWebhookController = () => import('#controllers/stripe_webhook_controller')
const UsersController = () => import('#controllers/users_controller')
const CouponsController = () => import('#controllers/coupons_controller')
const ShippingController = () => import('#controllers/shipping_controller')
const AuthController = () => import('#controllers/auth_controller')
const AdminOrdersController = () => import('#controllers/admin_orders_controller')
const OrdersController = () => import('#controllers/orders_controller')
const DiscountsController = () => import('#controllers/discounts_controller')

router
  .group(() => {
    // --- PUBLIC ROUTES ---
    router.post('/login', [AuthController, 'login'])
    router.post('/shipping/rates', [ShippingController, 'rates'])

    router.post('/orders', [OrdersController, 'store'])

    // Public Coupon Check (for Cart)
    router.post('/coupons/check', [CouponsController, 'check'])

    router.get('/products', [ProductsController, 'index'])
    router.get('/products/:id', [ProductsController, 'show'])
    router.post('/create-payment-intent', [PaymentController, 'createIntent'])
    router.post('/stripe-webhook', [StripeWebhookController, 'handle'])
    router.post('/users/save-contact', [UsersController, 'saveContact'])

    // --- PROTECTED ROUTES (Logged in Users) ---
    router
      .group(() => {
        router.get('/auth/me', [AuthController, 'me'])
      })
      .use(middleware.auth())

    // --- ADMIN ROUTES (Super Admin Only) ---
    router
      .group(() => {
        // Products
        // --- Admin Product Management ---
        router.get('/admin/products', [AdminProductsController, 'index']) // List with filters
        router.post('/products', [AdminProductsController, 'store'])
        router.put('/products/:id', [AdminProductsController, 'update'])

        // Actions
        router.patch('/products/:id/archive', [AdminProductsController, 'archive'])
        router.patch('/products/:id/restore', [AdminProductsController, 'restore'])

        // Product Discounts
        // router.get('/discounts', [CouponsController, 'listDiscounts'])

        // Coupons CRUD
        router.get('/coupons', [CouponsController, 'index'])
        router.post('/coupons', [CouponsController, 'store'])
        router.put('/coupons/:id', [CouponsController, 'update'])
        router.delete('/coupons/:id', [CouponsController, 'destroy'])

        router.patch('/coupons/:id/enable', [CouponsController, 'enable'])
        router.patch('/coupons/:id/disable', [CouponsController, 'disable'])

        // --- PROMOTIONS / DISCOUNTS ---
        router.get('/discounts', [DiscountsController, 'index']) // Replaces CouponsController.listDiscounts
        router.post('/discounts', [DiscountsController, 'store'])
        router.put('/discounts/:id', [DiscountsController, 'update'])
        router.delete('/discounts/:id', [DiscountsController, 'destroy'])

        // Inventory
        router.post('/inventory/adjust', [AdminInventoryController, 'adjust'])

        // --- ORDER MANAGEMENT ROUTES ---
        router.get('/orders', [AdminOrdersController, 'index']) // List
        router.get('/orders/:id', [AdminOrdersController, 'show']) // Details
        router.put('/orders/:id/status', [AdminOrdersController, 'updateStatus']) // Ship
      })
      .use(middleware.auth())
      .use(middleware.admin())
  })
  .prefix('api')

router.get('/', () => {
  return { hello: 'world' }
})
