import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

export async function getProductBin(req: Request, res: Response, next: NextFunction) {
  try {
    const itemCode = Array.isArray(req.params.itemCode) ? req.params.itemCode[0] : req.params.itemCode;
    const warehouse = req.query.warehouse as string | undefined;
    const userCookie = req.headers.cookie || "";

    const filters: any[] = [["item_code", "=", itemCode]];
    if (warehouse) {
      filters.push(["warehouse", "=", warehouse]);
    }

    const fields = [
      "name",
      "item_code",
      "warehouse",
      "actual_qty",
      "reserved_qty",
      "ordered_qty",
      "projected_qty",
    ];

    const result = await erpnextService.getResource("Bin", {
      fields,
      filters,
      limit_page_length: 50,
    }, userCookie ? { userCookie } : undefined);

    res.json(result.data);
  } catch (error) {
    next(error);
  }
}
