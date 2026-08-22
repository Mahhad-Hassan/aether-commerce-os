import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

function dateOnly(value: unknown): string {
  return String(value ?? "").slice(0, 10);
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function amount(record: Record<string, any>): number {
  return Number(record.grand_total ?? record.base_grand_total ?? record.total ?? 0) || 0;
}

function rangeTotal(records: Record<string, any>[], from: string, to: string): number {
  return records
    .filter((record) => inRange(dateOnly(record.posting_date ?? record.transaction_date ?? record.creation), from, to))
    .reduce((total, record) => total + amount(record), 0);
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const from = String(req.query.from ?? "").slice(0, 10);
    const to = String(req.query.to ?? "").slice(0, 10);
    const previousFrom = String(req.query.previous_from ?? "").slice(0, 10);
    const previousTo = String(req.query.previous_to ?? "").slice(0, 10);

    if (!from || !to || !previousFrom || !previousTo) {
      return res.status(400).json({ error: "Analytics date range is required" });
    }

    const headers = req.headers.cookie ? { userCookie: req.headers.cookie } : undefined;
    const [invoices, orders, customers, items] = await Promise.all([
      safeResource<Record<string, any>>("Sales Invoice", {
        fields: ["name", "posting_date", "creation", "grand_total", "base_grand_total", "total", "customer", "customer_name", "status", "docstatus"],
        filters: [["docstatus", "=", 1]],
        limit_page_length: 5000,
        order_by: "posting_date asc, creation asc",
      }, headers),
      safeResource<Record<string, any>>("Sales Order", {
        fields: ["name", "transaction_date", "creation", "grand_total", "customer", "customer_name", "status", "docstatus"],
        filters: [["docstatus", "!=", 2]],
        limit_page_length: 5000,
        order_by: "transaction_date asc, creation asc",
      }, headers),
      safeResource<Record<string, any>>("Customer", {
        fields: ["name", "customer_name", "creation", "disabled"],
        limit_page_length: 5000,
        order_by: "creation asc",
      }, headers),
      safeResource<Record<string, any>>("Sales Invoice Item", {
        fields: ["parent", "item_code", "item_name", "qty", "amount", "creation"],
        limit_page_length: 5000,
      }, headers),
    ]);

    const currentInvoices = invoices.filter((record) => inRange(dateOnly(record.posting_date ?? record.creation), from, to));
    const previousInvoices = invoices.filter((record) => inRange(dateOnly(record.posting_date ?? record.creation), previousFrom, previousTo));
    const currentOrders = orders.filter((record) => inRange(dateOnly(record.transaction_date ?? record.creation), from, to));
    const previousOrders = orders.filter((record) => inRange(dateOnly(record.transaction_date ?? record.creation), previousFrom, previousTo));
    const currentCustomers = customers.filter((record) => inRange(dateOnly(record.creation), from, to));
    const previousCustomers = customers.filter((record) => inRange(dateOnly(record.creation), previousFrom, previousTo));

    const revenue = currentInvoices.reduce((total, record) => total + amount(record), 0);
    const previousRevenue = previousInvoices.reduce((total, record) => total + amount(record), 0);
    const byDay = new Map<string, number>();
    for (const invoice of currentInvoices) {
      const day = dateOnly(invoice.posting_date ?? invoice.creation);
      byDay.set(day, (byDay.get(day) ?? 0) + amount(invoice));
    }

    const channelTotals = new Map<string, number>();
    for (const invoice of currentInvoices) {
      const channel = String(invoice.source ?? "Unattributed").trim() || "Unattributed";
      channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + amount(invoice));
    }
    const channelTotal = [...channelTotals.values()].reduce((sum, value) => sum + value, 0);
    const channels = [...channelTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value, pct: channelTotal ? Math.round((value / channelTotal) * 100) : 0 }));

    const invoiceNames = new Set(currentInvoices.map((invoice) => invoice.name));
    const topProducts = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of items) {
      if (!invoiceNames.has(item.parent)) continue;
      const key = String(item.item_code ?? item.item_name ?? "Unknown");
      const current = topProducts.get(key) ?? { name: item.item_name || key, qty: 0, revenue: 0 };
      current.qty += Number(item.qty) || 0;
      current.revenue += Number(item.amount) || 0;
      topProducts.set(key, current);
    }

    const growth = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / Math.abs(previous)) * 100;
    res.json({
      data: {
        revenue,
        previousRevenue,
        revenueGrowth: growth(revenue, previousRevenue),
        orders: currentOrders.length,
        previousOrders: previousOrders.length,
        ordersGrowth: growth(currentOrders.length, previousOrders.length),
        customers: currentCustomers.length,
        previousCustomers: previousCustomers.length,
        customersGrowth: growth(currentCustomers.length, previousCustomers.length),
        averageOrderValue: currentInvoices.length ? revenue / currentInvoices.length : 0,
        dailyRevenue: [...byDay.entries()].map(([date, value]) => ({ date, value })),
        channels,
        topProducts: [...topProducts.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
        invoiceCount: currentInvoices.length,
        orderCount: currentOrders.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function safeResource<T>(
  doctype: string,
  params: Parameters<typeof erpnextService.getResource>[1],
  headers?: Record<string, string>
): Promise<T[]> {
  try {
    const result = await erpnextService.getResource<T>(doctype, params, headers);
    return result.data ?? [];
  } catch (error: any) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.warn(`Analytics: skipping inaccessible ${doctype} dataset.`);
      return [];
    }
    throw error;
  }
}