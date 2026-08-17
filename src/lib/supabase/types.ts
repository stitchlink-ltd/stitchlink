export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: {
      app_role: "customer" | "tailor" | "admin";
      verification_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "expired";
      request_status:
        | "draft"
        | "submitted"
        | "negotiating"
        | "quoted"
        | "accepted"
        | "expired"
        | "declined"
        | "cancelled";
      quote_status: "draft" | "sent" | "superseded" | "accepted" | "declined" | "expired";
      order_status:
        | "pending_payment"
        | "pending_deposit"
        | "active"
        | "awaiting_balance"
        | "ready"
        | "shipped"
        | "delivered"
        | "disputed"
        | "completed"
        | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
