import "@/index.css";
import { useEffect, useRef, useState } from "react";
import {
  mountWidget,
  useLayout,
  useDisplayMode,
  useWidgetState,
} from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers";
import { Maximize2, Minimize2, Package } from "lucide-react";
import { LoadingScreen } from "../components/LoadingScreen";

// ── Types ──────────────────────────────────────────────────────────────────────

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

type UpdatableStatus = "confirmed" | "fulfilled" | "cancelled";

const UPDATABLE_STATUSES: UpdatableStatus[] = [
  "confirmed",
  "fulfilled",
  "cancelled",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  fulfilled: "#22c55e",
  cancelled: "#6b7280",
};

interface OrderItem {
  product: string;
  quantity: number;
}

interface Order {
  id: string;
  rawMessage: string;
  customerName: string;
  items: OrderItem[];
  deliveryDate: string | null;
  status: OrderStatus;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ── StatusPill ─────────────────────────────────────────────────────────────────

function StatusPill({
  status,
  onChange,
}: {
  status: OrderStatus;
  onChange: (s: UpdatableStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const color = STATUS_COLORS[status];

  return (
    <div className="status-pill-wrapper" ref={ref}>
      <button
        className="status-pill"
        style={{
          backgroundColor: `${color}20`,
          color,
          borderColor: `${color}40`,
        }}
        onClick={() => setOpen(!open)}
      >
        <span
          className="status-pill-dot"
          style={{ backgroundColor: color }}
        />
        {STATUS_LABELS[status]}
      </button>
      {open && (
        <div className="status-dropdown">
          {UPDATABLE_STATUSES.map((s) => (
            <button
              key={s}
              className={`status-dropdown-item ${s === status ? "active" : ""}`}
              onClick={() => {
                if (s !== status) onChange(s);
                setOpen(false);
              }}
            >
              <span
                className="status-pill-dot"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── OrderCard ──────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, status: UpdatableStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemsSummary = order.items
    .map((i) => `${i.quantity}× ${i.product}`)
    .join(", ");

  return (
    <div className="order-card">
      <div className="order-card-header">
        <span className="order-customer">{order.customerName}</span>
        <StatusPill
          status={order.status}
          onChange={(s) => onStatusChange(order.id, s)}
        />
      </div>

      <div
        className="order-items-summary"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "Hide original message" : "Show original message"}
      >
        <Package size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
        <span>{itemsSummary || "No items extracted"}</span>
      </div>

      {expanded && (
        <div className="order-raw-message">{order.rawMessage}</div>
      )}

      <div className="order-meta">
        {order.deliveryDate && (
          <span className="order-delivery">
            🚚 {formatDate(order.deliveryDate)}
          </span>
        )}
        <span className="order-date">{formatDate(order.createdAt)}</span>
      </div>
    </div>
  );
}

// ── SubmitForm ─────────────────────────────────────────────────────────────────

function SubmitForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (msg: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <textarea
        className="order-textarea"
        placeholder="Paste a raw order message (WhatsApp, email…) and Claude will extract the details"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <button
        className="add-btn"
        type="submit"
        disabled={!text.trim() || disabled}
      >
        {disabled ? "Parsing…" : "Submit Order"}
      </button>
    </form>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

function OrderInbox() {
  const { output, isPending } = useToolInfo<"manage-tasks">();
  const { callToolAsync } = useCallTool("manage-tasks");
  const { theme } = useLayout();
  const isDark = theme === "dark";
  const [displayMode, requestDisplayMode] = useDisplayMode();
  const [widgetState, setWidgetState] = useWidgetState<{ orders: Order[] }>();
  const [submitting, setSubmitting] = useState(false);
  const mutationCounter = useRef(0);

  useEffect(() => {
    if (output?.orders) {
      setWidgetState(() => ({ orders: output.orders as Order[] }));
    }
  }, [output?.orders]);

  if (isPending || widgetState?.orders === undefined) {
    return <LoadingScreen isDark={isDark} />;
  }

  const orders = widgetState.orders;
  const pending = orders.filter((o) => o.status === "pending").length;
  const confirmed = orders.filter((o) => o.status === "confirmed").length;
  const fulfilled = orders.filter((o) => o.status === "fulfilled").length;

  const syncWithServer = async (args: Parameters<typeof callToolAsync>[0]) => {
    const id = ++mutationCounter.current;
    const result = await callToolAsync(args);
    if (id === mutationCounter.current && result?.structuredContent?.orders) {
      setWidgetState(() => ({
        orders: result.structuredContent.orders as Order[],
      }));
    }
  };

  const handleSubmitOrder = async (rawMessage: string) => {
    setSubmitting(true);
    await syncWithServer({ rawMessage });
    setSubmitting(false);
  };

  const handleStatusChange = () => {
  // status updates removed for demo
};

  const isFullscreen = displayMode === "fullscreen";

  return (
    <div
      className={`todo-container ${isDark ? "dark" : "light"} ${isFullscreen ? "fullscreen" : ""}`}
      data-llm={`${pending} pending, ${confirmed} confirmed, ${fulfilled} fulfilled`}
    >
      <div className="todo-header">
        <h2>📦 Order Inbox</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="todo-stats">
            <span
              className="stat"
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
              }}
              title="Pending"
            >
              {pending}
            </span>
            <span
              className="stat"
              style={{
                background: "rgba(59,130,246,0.15)",
                color: "#3b82f6",
              }}
              title="Confirmed"
            >
              {confirmed}
            </span>
            <span className="stat completed-stat" title="Fulfilled">
              {fulfilled}
            </span>
          </div>
          <button
            className="display-mode-btn"
            onClick={() =>
              requestDisplayMode(isFullscreen ? "inline" : "fullscreen")
            }
            aria-label="Toggle display mode"
            title={isFullscreen ? "Minimize" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <SubmitForm onSubmit={handleSubmitOrder} disabled={submitting} />

      <div className="order-list">
        {orders.length === 0 ? (
          <div className="empty">
            No orders yet. Paste a raw message above or ask Claude to submit
            one.
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default OrderInbox;
mountWidget(<OrderInbox />);
