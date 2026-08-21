import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

export async function deliverSalesOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderName = Array.isArray(req.params.orderName)
      ? req.params.orderName[0]
      : req.params.orderName;
    const userCookie = req.headers.cookie || "";
    const headers = userCookie ? { userCookie } : undefined;
    const salesOrder = await erpnextService.getResourceByName<any>(
      "Sales Order",
      orderName,
      headers
    );
    const order = salesOrder.data;
    const items = (order.items || [])
      .map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: Math.max(0, Number(item.qty || 0) - Number(item.delivered_qty || 0)),
        rate: item.rate,
        uom: item.uom || item.stock_uom,
        warehouse: item.warehouse,
        against_sales_order: order.name,
        so_detail: item.name,
      }))
      .filter((item: any) => item.item_code && item.qty > 0);

    if (!items.length) {
      res.status(400).json({ error: "No undelivered items remain on this Sales Order." });
      return;
    }

    const deliveryNote = await erpnextService.createResource(
      "Delivery Note",
      {
        customer: order.customer,
        company: order.company,
        posting_date: new Date().toISOString().slice(0, 10),
        items,
      },
      headers
    );
    const submitted = await erpnextService.callMethod(
      "frappe.client.submit",
      { doc: deliveryNote.data },
      "POST",
      headers
    );

    res.json(submitted);
  } catch (error) {
    next(error);
  }
}