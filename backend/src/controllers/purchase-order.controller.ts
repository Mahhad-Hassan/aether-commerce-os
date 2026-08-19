import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

export async function getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userCookie = req.headers.cookie || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const supplier = (req.query.supplier as string) || "";
    const fromDate = (req.query.from_date as string) || "";
    const toDate = (req.query.to_date as string) || "";
    const sortBy = (req.query.sort_by as string) || "transaction_date";
    const sortOrder = (req.query.sort_order as string) || "desc";

    const filters: any[] = [];
    if (search) filters.push(["supplier_name", "like", `%${search}%`]);
    if (status) filters.push(["status", "=", status]);
    if (supplier) filters.push(["supplier", "=", supplier]);
    if (fromDate) filters.push(["transaction_date", ">=", fromDate]);
    if (toDate) filters.push(["transaction_date", "<=", toDate]);

    const fields = [
      "name",
      "supplier",
      "supplier_name",
      "transaction_date",
      "schedule_date",
      "status",
      "grand_total",
      "items",
      "creation",
      "modified",
    ];

    const result = await erpnextService.getResource("Purchase Order", {
      fields,
      filters,
      limit_page_length: limit,
      limit_start: (page - 1) * limit,
      order_by: `${sortBy} ${sortOrder}`,
    }, userCookie ? { userCookie } : undefined);

    res.json({
      data: result.data,
      total_count: result.data.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const userCookie = req.headers.cookie || "";
    const result = await erpnextService.createResource("Purchase Order", payload, userCookie ? { userCookie } : undefined);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
