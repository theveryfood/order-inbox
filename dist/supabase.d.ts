export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
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
export declare function insertOrder(userId: string, rawMessage: string, customerName: string, items: OrderItem[], deliveryDate: string | null): Promise<{
    error: import("@supabase/supabase-js").PostgrestError | null;
}>;
export declare function fetchOrders(userId: string): Promise<{
    orders: never[];
    error: import("@supabase/supabase-js").PostgrestError;
} | {
    orders: Order[];
    error: null;
}>;
export declare function updateOrderStatus(orderId: string, userId: string, status: "confirmed" | "fulfilled" | "cancelled"): Promise<{
    error: import("@supabase/supabase-js").PostgrestError | null;
}>;
