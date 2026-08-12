-- Keep these enum additions separate from their first use. PostgreSQL requires
-- the transaction that adds an enum value to commit before that value is used.
alter type public.installment_type add value if not exists 'full';
alter type public.order_status add value if not exists 'pending_payment';
