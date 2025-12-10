import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import User from '#models/user'
import Product from '#models/product'
import { DateTime } from 'luxon'

export default class AdminDashboardController {
  public async stats({ request, response }: HttpContext) {
    const startInput = request.input('startDate')
    const endInput = request.input('endDate')

    const end = endInput ? DateTime.fromISO(endInput).endOf('day') : DateTime.now().endOf('day')
    const start = startInput
      ? DateTime.fromISO(startInput).startOf('day')
      : end.minus({ days: 30 }).startOf('day')

    const durationInDays = end.diff(start, 'days').days
    const previousEnd = start.minus({ milliseconds: 1 }).endOf('day')
    const previousStart = previousEnd.minus({ days: durationInDays }).startOf('day')

    const currentRevenue = await this.getRevenue(start.toSQL()!, end.toSQL()!)
    const prevRevenue = await this.getRevenue(previousStart.toSQL()!, previousEnd.toSQL()!)
    const revenueGrowth = this.calculateGrowth(currentRevenue, prevRevenue)

    const currentOrders = await this.getOrderCount(start.toSQL()!, end.toSQL()!)
    const prevOrders = await this.getOrderCount(previousStart.toSQL()!, previousEnd.toSQL()!)
    const ordersGrowth = this.calculateGrowth(currentOrders, prevOrders)

    const currentCustomers = await this.getNewCustomersCount(start.toSQL()!, end.toSQL()!)
    const prevCustomers = await this.getNewCustomersCount(
      previousStart.toSQL()!,
      previousEnd.toSQL()!
    )
    const customerGrowth = this.calculateGrowth(currentCustomers, prevCustomers)

    const salesChart = await this.getSalesChart(start, end)

    // FIX: Top Products Query (Handle potential nulls/strings from DB driver)
    const topProductsRaw = await db
      .from('order_items')
      .join('orders', 'orders.id', 'order_items.order_id')
      .join('products', 'products.id', 'order_items.product_id')
      .whereIn('orders.status', ['succeeded', 'SHIPPED', 'READY_TO_SHIP'])
      .whereBetween('orders.created_at', [start.toSQL()!, end.toSQL()!])
      .groupBy('order_items.product_id', 'order_items.product_name', 'products.image')
      .select('order_items.product_name as productName')
      .select('products.image')
      .sum('order_items.quantity as totalSold')
      .sum('order_items.total_price as totalRevenue')
      .orderBy('totalSold', 'desc')
      .limit(5)

    // Map and sanitize to ensure numbers
    const topProducts = topProductsRaw.map((p: any) => ({
      productName: p.productName,
      image: p.image,
      totalSold: Number(p.totalSold || 0),
      totalRevenue: Number(p.totalRevenue || 0),
    }))

    const lowStockProducts = await Product.query()
      .where('stock', '<=', 10)
      .where('status', 'ACTIVE')
      .orderBy('stock', 'asc')
      .limit(5)
      .select('id', 'name', 'stock', 'image')

    const recentOrders = await Order.query().preload('user').orderBy('created_at', 'desc').limit(5)

    return response.ok({
      meta: {
        start: start.toISODate(),
        end: end.toISODate(),
      },
      kpi: {
        revenue: { value: currentRevenue, growth: revenueGrowth, previous: prevRevenue },
        orders: { value: currentOrders, growth: ordersGrowth, previous: prevOrders },
        customers: { value: currentCustomers, growth: customerGrowth, previous: prevCustomers },
        aov: {
          value: currentOrders > 0 ? currentRevenue / currentOrders : 0,
          growth: 0,
        },
      },
      chart: salesChart,
      topProducts,
      lowStockProducts,
      recentOrders,
    })
  }

  // --- HELPERS (Unchanged) ---
  private async getRevenue(start: string, end: string) {
    const result = await db
      .from('orders')
      .whereBetween('created_at', [start, end])
      .whereIn('status', ['succeeded', 'SHIPPED', 'READY_TO_SHIP'])
      .sum('total_amount as total')
    return Number(result[0].total) || 0
  }

  private async getOrderCount(start: string, end: string) {
    const result = await db
      .from('orders')
      .whereBetween('created_at', [start, end])
      .count('* as total')
    return Number(result[0].total) || 0
  }

  private async getNewCustomersCount(start: string, end: string) {
    const result = await User.query().whereBetween('created_at', [start, end]).count('* as total')
    return Number(result[0].$extras.total) || 0
  }

  private calculateGrowth(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0
    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  private async getSalesChart(start: DateTime, end: DateTime) {
    const rawData = await db
      .from('orders')
      .select(db.raw('DATE(created_at) as date'))
      .sum('total_amount as total')
      .whereBetween('created_at', [start.toSQL()!, end.toSQL()!])
      .whereIn('status', ['succeeded', 'SHIPPED', 'READY_TO_SHIP'])
      .groupBy('date')
      .orderBy('date', 'asc')

    const chartData = []
    let currentCursor = start

    while (currentCursor <= end) {
      const dateStr = currentCursor.toISODate()
      const dayData = rawData.find((d: any) => {
        const dDate = d.date instanceof Date ? d.date.toISOString().split('T')[0] : d.date
        return dDate === dateStr
      })
      chartData.push({
        date: dateStr,
        value: dayData ? Number(dayData.total) : 0,
      })
      currentCursor = currentCursor.plus({ days: 1 })
    }
    return chartData
  }
}
