import { Request, Response, NextFunction } from "express";
import { erpnextService } from "../services/erpnext.service.js";

/**
 * Handles pass-through GET/POST/PUT/DELETE requests for /api/resource/* or /api/method/*
 */
export async function handleGenericProxy(req: Request, res: Response, next: NextFunction) {
  try {
    const urlPath = `/api${req.path}`; // e.g. /api/resource/Sales Order
    const method = req.method;
    const body = req.body;
    const query = req.query;

    // Forward the browser session cookie so Frappe can resolve the logged-in user.
    const forwardHeaders: Record<string, string> = {};
    if (req.headers.cookie) {
      forwardHeaders["userCookie"] = req.headers.cookie as string;
      console.log("=== Proxy: Forwarding user cookie ===", {
        cookieLength: (req.headers.cookie as string).length,
        path: req.path,
      });
    } else {
      console.log("=== Proxy: No cookie found ===", { path: req.path });
    }

    const response = await erpnextService.proxyRequest(method, urlPath, body, query, forwardHeaders);

    // Forward set-cookie if ERPNext sent any login cookies
    if (response.headers["set-cookie"]) {
      res.setHeader("set-cookie", response.headers["set-cookie"]);
    }

    console.log("=== Proxy response ===", {
      path: req.path,
      statusCode: response.status,
      dataString: JSON.stringify(response.data).substring(0, 500),
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      console.error("ERPNext proxy error:", {
        status,
        statusText: error.response.statusText,
        data,
        url: req.originalUrl,
        method: req.method,
      });

      const parsedMessage = parseERPNextErrorMessage(data);
      if (parsedMessage) {
        res.status(status).json({ error: parsedMessage, raw: data });
      } else {
        res.status(status).json(data);
      }
    } else {
      next(error);
    }
  }
}

function parseERPNextErrorMessage(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  const serverMessages = data._server_messages;
  if (typeof serverMessages !== "string") return null;

  try {
    const parsed = JSON.parse(serverMessages);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const first = parsed[0];
    const messageObj = typeof first === "string" ? JSON.parse(first) : first;
    return messageObj.message || messageObj.title || null;
  } catch {
    return null;
  }
}
