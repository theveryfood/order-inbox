# Order Inbox

## Value Proposition
Manage incoming customer orders from messy WhatsApp or email messages. Target: food distribution businesses receiving orders via informal channels. Pain: manually reading and transcribing unstructured messages, losing track of order status, no single view of all pending orders.

**Core actions**: Submit raw order messages (Claude extracts structured data), view all orders, update order status (pending → confirmed → fulfilled / cancelled).

## Why LLM?
**Parsing win**: "hey can i get 3 cases of olive oil and 10kg pasta for friday delivery thx" → structured order with customer name, items, quantities, and delivery date.
**LLM adds**: Natural language order parsing, tolerance for typos/abbreviations, multi-item extraction from a single unstructured message.
**What LLM lacks**: Persistent storage (Supabase), user identity (Clerk).

## UI Overview
**First view**: List of all orders sorted by creation date, showing customer name, items summary, delivery date, and status badge.
**Key interactions**: Paste a raw message to submit a new order, click a status pill to advance an order through its lifecycle.
**End state**: Updated order list persisted in Supabase.

## Product Context
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **AI**: Claude (Anthropic) for order extraction
- **Constraints**: Orders are per-user, authenticated access only

## UX Flows

### Submit order
1. User pastes raw WhatsApp/email message (from widget form or via Claude conversation)
2. Claude extracts: customer name, items with quantities, delivery date
3. Order saved to DB with status "pending"
4. Returns updated order list

### Manage orders
1. View order list (all statuses, newest first)
2. Click status pill to update: pending → confirmed, fulfilled, or cancelled
3. Changes are persisted immediately

## Tools and Widgets

**Widget: manage-tasks** (Skybridge internal name)
- **Input**:
  - `rawMessage?: string` — raw WhatsApp or email order text to parse with Claude and save
  - `statusUpdate?: { orderId: string, status: "confirmed" | "fulfilled" | "cancelled" }` — status change to apply to an existing order
- **Output**: `{ orders[] }` (each: id, customerName, items, deliveryDate, status, rawMessage, createdAt)
- **Views**: order card list with status pills, delivery dates, item summaries, expandable raw message
- **Behavior**:
  - No inputs → fetch and display all orders
  - `rawMessage` provided → parse with Claude, save as new order, return updated list
  - `statusUpdate` provided → update status, return updated list
  - Both can be provided in a single call
