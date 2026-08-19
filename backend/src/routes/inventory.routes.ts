import { Router } from "express";
import { getProductBin } from "../controllers/inventory.controller.js";

const router = Router();

router.get("/inventory/bin/:itemCode", getProductBin);

export default router;
