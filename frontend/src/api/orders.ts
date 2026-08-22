import { api } from "./client";

const isMinimalSalesOrder = (order: any): order is { name: string } =>
  order &&
  typeof order === "object" &&
  Object.keys(order).length === 1 &&
  typeof order.name === "string";

const normalizeERPNextResponse = (payload: any) => {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  if (payload.message && typeof payload.message === "object") {
    return payload.message;
  }
  return payload;
};

export async function getOrders(status?: string) {
  const params: Record<string, string | number> = {
    fields: JSON.stringify(["*"]),
    limit_page_length: 5000,
    order_by: "creation desc",
  };
  if (status) {
    params.filters = JSON.stringify(status === "Draft"
      ? [["docstatus", "=", 0]]
      : [["status", "=", status]]);
  }

  const { data } = await api.get("/resource/Sales Order", {
    params,
  });

  const rawOrders = Array.isArray(data?.data) ? data.data : [];
  console.log("FULL API RESPONSE:", rawOrders);

  const matchesStatus = (order: any) => {
    if (!status) return true;
    const frappeStatus = String(order?.status ?? "").trim().toLowerCase();
    if (frappeStatus === status.toLowerCase()) return true;
    return status.toLowerCase() === "draft" && Number(order?.docstatus) === 0;
  };

  if (!rawOrders.some(isMinimalSalesOrder)) {
    const matched = rawOrders.filter(matchesStatus);
    console.log("Sales Order status filter result:", {
      requestedStatus: status ?? "all",
      received: rawOrders.map((order: any) => ({ name: order.name, status: order.status, docstatus: order.docstatus })),
      matched: matched.length,
    });
    return matched;
  }

  console.warn(
    "Sales Order list response only included names, fetching full Sales Order details for each record."
  );

  const detailedOrders = await Promise.all(
    rawOrders.map(async (order: any) => {
      const name = order?.name;
      if (!name) return order;
      try {
        console.log(`Fetching Sales Order detail for ${name}`);
        const response = await api.get(`/resource/Sales Order/${encodeURIComponent(name)}`, {
          params: {
            fields: JSON.stringify(["*"]),
          },
        });

        const detailData = response.data?.data || response.data?.message || response.data;
        const hasDetail = detailData && typeof detailData === "object" && Object.keys(detailData).length > 1;
        return hasDetail ? detailData : order;
      } catch (error) {
        console.error(`Failed to fetch Sales Order detail for ${name}:`, error);
        return order;
      }
    })
  );

  console.log("FULL SALES ORDER DETAILS:", detailedOrders);
  const matched = detailedOrders.filter(matchesStatus);
  console.log("Sales Order status filter result:", {
    requestedStatus: status ?? "all",
    received: detailedOrders.map((order: any) => ({ name: order.name, status: order.status, docstatus: order.docstatus })),
    matched: matched.length,
  });
  return matched;
}

export async function updateSalesOrderStatus(orderName: string, status: string) {
  const response = await api.put(`/resource/Sales Order/${encodeURIComponent(orderName)}`, {
    status,
  });
  return response.data?.data ?? response.data;
}

export async function deliverSalesOrder(orderName: string) {
  const response = await api.post(`/orders/${encodeURIComponent(orderName)}/deliver`);
  return response.data;
}