import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
console.log("Supabase URL:", env.SUPABASE_URL);
console.log("Supabase key prefix:", env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 12), "len:", env.SUPABASE_SERVICE_ROLE_KEY.length);

export interface OrderItem {
  product: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  rawMessage: string;
  customerName: string;
  items: OrderItem[];
  deliveryDate: string | null;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  createdAt: string;
}

export async function insertOrder(
  userId: string,
  rawMessage: string,
  customerName: string,
  items: OrderItem[],
  deliveryDate: string | null,
) {
  const { error } = await supabase.from("orders").insert({
    user_id: userId,
    raw_message: rawMessage,
    customer_name: customerName,
    items,
    delivery_date: deliveryDate || null,
    status: "pending",
  });
  return { error };
}

export async function fetchOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, raw_message, customer_name, items, delivery_date, status, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { orders: [], error };

  const orders: Order[] = (data || []).map((o) => ({
    id: o.id,
    userId: o.user_id,
    rawMessage: o.raw_message,
    customerName: o.customer_name,
    items: o.items as OrderItem[],
    deliveryDate: o.delivery_date,
    status: o.status,
    createdAt: o.created_at,
  }));

  return { orders, error: null };
}

export async function updateOrderStatus(
  orderId: string,
  userId: string,
  status: "confirmed" | "fulfilled" | "cancelled",
) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("user_id", userId);
  return { error };
}
