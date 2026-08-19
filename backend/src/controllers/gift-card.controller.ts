import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

export async function getGiftCards(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";

    const filters: any[] = [];
    if (search) {
      filters.push(["card_number", "like", `%${search}%`]);
    }

    const fields = [
      "name",
      "card_number",
      "customer",
      "customer_name",
      "balance",
      "initial_amount",
      "expiry_date",
      "status",
      "creation",
    ];

    try {
      const result = await erpnextService.getResource("Gift Card", {
        fields,
        filters,
        limit_page_length: limit,
        limit_start: (page - 1) * limit,
        order_by: "creation desc",
      });
      res.json({ data: result.data });
    } catch (err: any) {
      if (err.response?.status === 404) {
        res.json({ data: [] });
        return;
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
}
