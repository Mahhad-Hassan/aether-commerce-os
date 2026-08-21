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

export async function getOrders() {
  const { data } = await api.get("/resource/Sales Order", {
    params: {
      fields: JSON.stringify(["*"]),
      limit_page_length: 100,
      order_by: "creation desc",
    },
  });

  const rawOrders = data?.data || [];
  console.log("FULL API RESPONSE:", rawOrders);

  if (!rawOrders.some(isMinimalSalesOrder)) {
    return rawOrders;
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
  return detailedOrders;
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