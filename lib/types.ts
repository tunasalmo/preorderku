export type PreorderStatus = "open" | "closed";

export type Preorder = {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  pickup_date: string;
  pickup_location: string;
  deadline: string;
  status: PreorderStatus;
  created_at: string;
};

export type Product = {
  id: string;
  preorder_id: string;
  name: string;
  price: number;
  max_qty: number | null;
};

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export type Order = {
  id: string;
  preorder_id: string;
  buyer_name: string;
  buyer_phone: string;
  paid: boolean;
  picked_up: boolean;
  created_at: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
  snap_token: string | null;
  midtrans_order_id: string | null;
  gross_amount: number | null;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
};

export type PublicProduct = Product & { sold: number };
