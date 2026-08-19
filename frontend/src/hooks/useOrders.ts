import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/api/orders";
import { adaptFrappeOrders } from "@/lib/order-adapter";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const rawOrders = await getOrders();
      return adaptFrappeOrders(rawOrders);
    },
  });
}
