/*
Postgres model sketch:
- users(id PK, email UNIQUE, role, created_at)
- products(id PK, name, description, price_cents, tags JSONB, inventory)
- orders(id PK, user_id FK users.id, items JSONB, subtotal_cents, discount_cents, total_cents, status, created_at)
- reviews(id PK, user_id FK users.id, product_id FK products.id, rating, body, created_at)
- error_logs(id PK, area, message, stack, metadata JSONB, created_at)
- ai_incidents(id PK, incident_type, severity, summary, related_error_log_ids JSONB, created_at)
*/

export { type User, type Product, type Order, type Review, type ErrorLog, type AIIncident } from "../types/domain";
