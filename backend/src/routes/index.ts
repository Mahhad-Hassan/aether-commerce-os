import { Router } from "express";
import productRoutes from "./product.routes.js";
import purchaseOrderRoutes from "./purchase-order.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import giftCardRoutes from "./gift-card.routes.js";
import storesRoutes from "./stores.routes.js";
import purchaseInvoiceRoutes from "./purchase-invoice.routes.js";
import saleInvoiceRoutes from "./sale-invoice.routes.js";
import orderRoutes from "./order.routes.js";
import customerRoutes from "./customer.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import { handleGenericProxy } from "../controllers/proxy.controller.js";

const apiRouter = Router();

// Modular Express routes for Aether Middleware
apiRouter.use("/", productRoutes);
apiRouter.use("/", purchaseOrderRoutes);
apiRouter.use("/", inventoryRoutes);
apiRouter.use("/", giftCardRoutes);
apiRouter.use("/", storesRoutes);
apiRouter.use("/", purchaseInvoiceRoutes);
apiRouter.use("/", saleInvoiceRoutes);
apiRouter.use("/", orderRoutes);
apiRouter.use("/", customerRoutes);
apiRouter.use("/", analyticsRoutes);

// Pass-through proxy routes to ERPNext REST API for resources & methods
apiRouter.all("/resource/*", handleGenericProxy);
apiRouter.all("/method/*", handleGenericProxy);

export default apiRouter;
