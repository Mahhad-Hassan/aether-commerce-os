import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    // Use service account (API token) for data fetching - has full access
    // Don't use user session cookie which may have restricted permissions
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || "";
    const itemGroup = (req.query.item_group as string) || "";
    const disabled = req.query.disabled !== undefined ? parseInt(req.query.disabled as string) : undefined;
    const sortBy = (req.query.sort_by as string) || "modified";
    const sortOrder = (req.query.sort_order as string) || "desc";

    const filters: any[] = [];
    if (disabled !== undefined) filters.push(["disabled", "=", disabled]);
    if (itemGroup) filters.push(["item_group", "=", itemGroup]);
    if (search) {
      filters.push(["item_name", "like", `%${search}%`]);
    }

    const fields = [
      "name",
      "item_code",
      "item_name",
      "item_group",
      "description",
      "standard_rate",
      "valuation_rate",
      "is_stock_item",
      "has_variants",
      "variant_of",
      "brand",
      "weight_per_unit",
      "weight_uom",
      "stock_uom",
      "image",
      "disabled",
      "creation",
      "modified",
    ];

    const result = await erpnextService.getResource("Item", {
      fields,
      filters,
      limit_page_length: limit,
      limit_start: (page - 1) * limit,
      order_by: `${sortBy} ${sortOrder}`,
    });

    const totalCount = await erpnextService.callMethod(
      "frappe.client.get_count",
      { doctype: "Item", filters },
      "GET"
    ).then((res) => res.message || result.data.length).catch(() => result.data.length);

    res.json({
      data: result.data,
      total_count: totalCount,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const itemCode = Array.isArray(req.params.itemCode) ? req.params.itemCode[0] : req.params.itemCode;
    const userCookie = req.headers.cookie || "";
    const result = await erpnextService.getResourceByName("Item", itemCode as string, userCookie ? { userCookie } : undefined);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getItemGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const userCookie = req.headers.cookie || "";
    const fields = ["name", "item_group_name", "parent_item_group", "is_group", "image"];
    const result = await erpnextService.getResource("Item Group", {
      fields,
      limit_page_length: 100,
      order_by: "item_group_name asc",
    }, userCookie ? { userCookie } : undefined);
    res.json(result.data);
  } catch (error) {
    next(error);
  }
}
