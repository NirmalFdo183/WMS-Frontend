import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  PackageMinus,
  PieChart as PieChartIcon,
  PackageCheck,
  PackageX,
  RefreshCw,
  Timer,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useWarehouse } from "../context/WarehouseContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Product {
  id: number;
  name: string;
  material_code: string;
  shelf_stock?: number;
  pending_stock?: number;
  total_units?: number;
}

interface BatchStock {
  id: number;
  remain_qty: number;
  netprice: number;
  expiry_date?: string | null;
  product?: Pick<Product, "id" | "name" | "material_code">;
}

interface LoadingItem {
  id: number;
  qty: number;
}

interface LoadingRecord {
  id: number;
  load_number: string;
  loading_date?: string | null;
  prepared_date?: string | null;
  status: "pending" | "delivered" | "not_delivered";
  route?: {
    route_code?: string;
    route_description?: string;
    name?: string;
  };
  truck?: {
    licence_plate_no?: string;
    truck_number?: string;
  };
  loading_items?: LoadingItem[];
}

type Tone = "teal" | "sky" | "amber" | "emerald";

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const LOW_STOCK_LIMIT = 50; // units
const EXPIRY_WINDOW_DAYS = 90;
const TREND_DAYS = 30;
const LOADINGS_FETCH_LIMIT = 500;
const RECENT_DISPATCH_COUNT = 8;

const STATUS_META: Record<LoadingRecord["status"], { label: string; color: string; badge: string }> = {
  pending: {
    label: "Pending",
    color: "#d97706",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  delivered: {
    label: "Delivered",
    color: "#0f766e",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  not_delivered: {
    label: "Not delivered",
    color: "#dc2626",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toneStyles: Record<Tone, string> = {
  teal: "bg-teal-50 border-teal-100 text-teal-800",
  sky: "bg-sky-50 border-sky-100 text-sky-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const productUnits = (product: Product) =>
  product.total_units ?? (product.shelf_stock ?? 0) + (product.pending_stock ?? 0);

const minutesAgo = (from: Date, now: Date) => {
  const mins = Math.floor((now.getTime() - from.getTime()) / 60000);
  if (mins <= 0) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  return from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
};

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const MetricCard = ({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
}) => (
  <div className="w-full bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl 2xl:text-2xl font-bold text-slate-900 tabular-nums mt-1.5 break-words">{value}</p>
      </div>
      <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${toneStyles[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
    </div>
  </div>
);

const Panel = ({
  title,
  subtitle,
  icon: Icon,
  aside,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden flex flex-col ${className}`}>
    <div className="px-5 py-4 border-b border-stone-200 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-teal-800" />
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {aside}
    </div>
    {children}
  </section>
);

const CountBadge = ({ count, tone }: { count: number; tone: "amber" | "red" | "slate" }) => {
  const styles = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-stone-50 text-slate-600 border-stone-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold tabular-nums ${styles[tone]}`}>
      {count.toLocaleString()}
    </span>
  );
};

const EmptyState = ({ title, detail }: { title: string; detail: string }) => (
  <div className="px-5 py-10 flex flex-col items-center text-center flex-1 justify-center">
    <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
      <CheckCircle2 className="w-5 h-5" />
    </span>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{detail}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTotalValue } = useWarehouse();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [loadings, setLoadings] = useState<LoadingRecord[]>([]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setFetchWarning(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const results = await Promise.allSettled([
      axios.get(`${baseUrl}/products`),
      axios.get(`${baseUrl}/batch-stocks`),
      axios.get(`${baseUrl}/loadings?limit=${LOADINGS_FETCH_LIMIT}`),
    ]);

    const sectionNames = ["products", "stock", "dispatches"];
    const failed = results
      .map((result, index) => (result.status === "rejected" ? sectionNames[index] : null))
      .filter((name): name is string => name !== null);

    const [productsRes, batchesRes, loadingsRes] = results;
    if (productsRes.status === "fulfilled") setProducts(extractArray<Product>(productsRes.value.data));
    if (batchesRes.status === "fulfilled") setBatches(extractArray<BatchStock>(batchesRes.value.data));
    if (loadingsRes.status === "fulfilled") setLoadings(extractArray<LoadingRecord>(loadingsRes.value.data));

    if (failed.length > 0) setFetchWarning(`Some ${failed.join(", ")} data could not be loaded.`);
    setLastUpdated(new Date());
    setNow(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep the "updated X min ago" label fresh
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    await Promise.all([fetchData(true), refreshTotalValue()]);
  };

  const data = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const trendStart = new Date(todayStart);
    trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
    const expiryLimit = new Date(todayStart);
    expiryLimit.setDate(expiryLimit.getDate() + EXPIRY_WINDOW_DAYS);

    const loadingDate = (record: LoadingRecord) => {
      const date = new Date(record.loading_date || record.prepared_date || "");
      if (Number.isNaN(date.getTime())) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };
    const loadUnits = (record: LoadingRecord) =>
      (record.loading_items ?? []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    // Cards
    const pending = loadings.filter((record) => record.status === "pending");
    const pendingUnits = pending.reduce((sum, record) => sum + loadUnits(record), 0);
    const recent = loadings.filter((record) => {
      const date = loadingDate(record);
      return date !== null && date >= trendStart;
    });
    const deliveredRecent = recent.filter((record) => record.status === "delivered").length;
    const failedRecent = recent.filter((record) => record.status === "not_delivered").length;
    const closedRecent = deliveredRecent + failedRecent;
    const successRate = closedRecent > 0 ? Math.round((deliveredRecent / closedRecent) * 100) : null;

    // Deliveries per day (by loading date) for the trend chart
    const trendMap = new Map<string, { delivered: number; not_delivered: number; pending: number }>();
    for (const record of recent) {
      const key = dayKey(loadingDate(record) as Date);
      const bucket = trendMap.get(key) ?? { delivered: 0, not_delivered: 0, pending: 0 };
      bucket[record.status] = (bucket[record.status] ?? 0) + 1;
      trendMap.set(key, bucket);
    }
    const deliveryTrend = Array.from({ length: TREND_DAYS }, (_, index) => {
      const date = new Date(trendStart);
      date.setDate(date.getDate() + index);
      const bucket = trendMap.get(dayKey(date)) ?? { delivered: 0, not_delivered: 0, pending: 0 };
      return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), ...bucket };
    });

    // Pending loadings, oldest first, with how long they have been waiting
    const waiting = pending
      .map((record) => {
        const date = loadingDate(record);
        const daysWaiting = date ? Math.round((todayStart.getTime() - date.getTime()) / 86400000) : null;
        return { record, units: loadUnits(record), daysWaiting };
      })
      .sort((a, b) => (b.daysWaiting ?? -1) - (a.daysWaiting ?? -1));

    // Dispatch status split
    const statusCounts = (Object.keys(STATUS_META) as LoadingRecord["status"][]).map((status) => ({
      status,
      name: STATUS_META[status].label,
      value: loadings.filter((record) => record.status === status).length,
      color: STATUS_META[status].color,
    }));

    // Low stocks: out of stock first, then fewest units
    const lowStock = products
      .map((product) => ({ product, units: productUnits(product) }))
      .filter(({ units }) => units <= LOW_STOCK_LIMIT)
      .sort((a, b) => a.units - b.units || a.product.name.localeCompare(b.product.name));

    // Expiring soon: expired batches first, then soonest expiry
    const expiring = batches
      .filter((batch) => batch.expiry_date && Number(batch.remain_qty) > 0)
      .map((batch) => ({ batch, expiry: new Date(batch.expiry_date as string) }))
      .filter(({ expiry }) => !Number.isNaN(expiry.getTime()) && expiry <= expiryLimit)
      .map(({ batch, expiry }) => ({
        batch,
        expiry,
        expired: expiry < todayStart,
        daysLeft: Math.ceil((expiry.getTime() - todayStart.getTime()) / 86400000),
      }))
      .sort((a, b) => a.expiry.getTime() - b.expiry.getTime());

    const recentLoadings = [...loadings]
      .sort((a, b) => {
        const aDate = new Date(a.loading_date || a.prepared_date || 0).getTime();
        const bDate = new Date(b.loading_date || b.prepared_date || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, RECENT_DISPATCH_COUNT);

    return {
      pendingCount: pending.length,
      pendingUnits,
      deliveredRecent,
      failedRecent,
      successRate,
      deliveryTrend,
      recentTotal: recent.length,
      waiting,
      statusCounts,
      totalLoadings: loadings.length,
      lowStock,
      expiring,
      expiredCount: expiring.filter((row) => row.expired).length,
      recentLoadings,
    };
  }, [batches, loadings, products]);

  if (loading) {
    return (
      <div className="w-full min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-teal-700 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">Preparing your warehouse overview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="text-teal-800" size={30} />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Warehouse Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1.5 ml-10">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock3 className="w-3.5 h-3.5" />
              Updated {minutesAgo(lastUpdated, now)}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-slate-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-700" : ""}`} />
              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {fetchWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{fetchWarning}</span>
            </div>
            <button type="button" onClick={handleRefresh} className="font-semibold hover:underline self-start sm:self-auto">
              Try again
            </button>
          </div>
        )}

        {/* Delivery cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Pending dispatches"
            value={data.pendingCount.toLocaleString()}
            icon={Truck}
            tone={data.pendingCount > 0 ? "amber" : "teal"}
          />
          <MetricCard label="Units out on trucks" value={data.pendingUnits.toLocaleString()} icon={PackageCheck} tone="sky" />
          <MetricCard
            label={`Delivered (last ${TREND_DAYS} days)`}
            value={data.deliveredRecent.toLocaleString()}
            icon={CheckCircle2}
            tone="emerald"
          />
          <MetricCard
            label={`Not delivered (last ${TREND_DAYS} days)`}
            value={data.failedRecent.toLocaleString()}
            icon={PackageX}
            tone={data.failedRecent > 0 ? "amber" : "teal"}
          />
        </div>

        {/* Delivery charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel
            title="Deliveries"
            subtitle={`Loadings per day, last ${TREND_DAYS} days`}
            icon={Truck}
            className="lg:col-span-2"
            aside={
              <div className="text-right">
                <p className="text-[11px] text-slate-500">Success rate</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums">
                  {data.successRate === null ? "–" : `${data.successRate}%`}
                </p>
              </div>
            }
          >
            <div className="px-3 pt-4 pb-2 h-72">
              {data.recentTotal === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  No loadings in the last {TREND_DAYS} days.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.deliveryTrend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e7e5e4" }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "#f5f5f4" }}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="delivered" name="Delivered" stackId="s" fill={STATUS_META.delivered.color} />
                    <Bar dataKey="not_delivered" name="Not delivered" stackId="s" fill={STATUS_META.not_delivered.color} />
                    <Bar dataKey="pending" name="Pending" stackId="s" fill={STATUS_META.pending.color} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel title="Dispatch status" subtitle="All recorded loadings" icon={PieChartIcon}>
            {data.totalLoadings === 0 ? (
              <EmptyState title="No dispatches yet" detail="Loadings will appear here once created." />
            ) : (
              <div className="p-5 flex flex-col items-center gap-4">
                <div className="relative w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusCounts}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="90%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.statusCounts.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">{data.totalLoadings}</span>
                    <span className="text-[11px] text-slate-500">loadings</span>
                  </div>
                </div>
                <ul className="w-full space-y-2">
                  {data.statusCounts.map((entry) => (
                    <li key={entry.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        {/* Waiting deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel
            title="Waiting to be delivered"
            subtitle="Pending loadings, longest waiting first. Click a row for details."
            icon={Timer}
            aside={<CountBadge count={data.waiting.length} tone={data.waiting.length > 0 ? "amber" : "slate"} />}
            className="lg:order-1"
          >
            {data.waiting.length === 0 ? (
              <EmptyState title="Nothing waiting" detail="Every loading has been closed off." />
            ) : (
              <div className="overflow-auto max-h-80">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 sticky top-0">
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5 font-semibold">Loading</th>
                      <th className="px-4 py-2.5 font-semibold">Route / truck</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Units</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Waiting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.waiting.map(({ record, units, daysWaiting }) => (
                      <tr
                        key={record.id}
                        onClick={() => navigate(`/supply-invoices?tab=loading&loadingId=${record.id}`)}
                        className="hover:bg-stone-50 transition-colors cursor-pointer"
                        title="View delivery details"
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-slate-800">{record.load_number}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(record.loading_date || record.prepared_date)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{record.route?.route_code || record.route?.name || "Not set"}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {record.truck?.licence_plate_no || record.truck?.truck_number || "Not set"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">{units.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {daysWaiting === null ? (
                            <span className="text-xs text-slate-500">No date</span>
                          ) : daysWaiting <= 0 ? (
                            <span className="text-sm font-medium text-slate-700">Today</span>
                          ) : (
                            <span className={`text-sm font-semibold tabular-nums ${daysWaiting >= 3 ? "text-red-700" : "text-amber-700"}`}>
                              {daysWaiting} {daysWaiting === 1 ? "day" : "days"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

        {/* Stock risk tables */}
        <div className="contents">
          <Panel
            title="Low stocks"
            subtitle={`Products with ${LOW_STOCK_LIMIT} units or fewer`}
            icon={PackageMinus}
            aside={<CountBadge count={data.lowStock.length} tone={data.lowStock.length > 0 ? "amber" : "slate"} />}
            className="lg:order-3 lg:col-span-2"
          >
            {data.lowStock.length === 0 ? (
              <EmptyState title="Stock levels look healthy" detail={`No product is at or below ${LOW_STOCK_LIMIT} units.`} />
            ) : (
              <div className="overflow-auto max-h-80">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 sticky top-0">
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold">Code</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Units left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.lowStock.map(({ product, units }) => (
                      <tr key={product.id}>
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{product.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{product.material_code}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {units <= 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md border text-[11px] font-semibold bg-red-50 text-red-700 border-red-200">
                              Out of stock
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-amber-700 tabular-nums">{units.toLocaleString()}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Expiring soon"
            subtitle={`Batches expiring within ${EXPIRY_WINDOW_DAYS} days`}
            icon={CalendarClock}
            className="lg:order-2"
            aside={
              <div className="flex items-center gap-1.5">
                {data.expiredCount > 0 && <CountBadge count={data.expiredCount} tone="red" />}
                <CountBadge count={data.expiring.length} tone={data.expiring.length > 0 ? "amber" : "slate"} />
              </div>
            }
          >
            {data.expiring.length === 0 ? (
              <EmptyState title="Nothing expiring soon" detail={`No batch expires in the next ${EXPIRY_WINDOW_DAYS} days.`} />
            ) : (
              <div className="overflow-y-auto max-h-[294px]">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 sticky top-0">
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Units</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.expiring.map(({ batch, expired, daysLeft }) => (
                      <tr key={batch.id} className={expired ? "bg-red-50/40" : undefined}>
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">
                          {batch.product?.name ?? "Stock batch"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
                          {Number(batch.remain_qty).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <p className={`text-sm font-medium ${expired ? "text-red-700" : "text-slate-700"}`}>
                            {formatDate(batch.expiry_date)}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${expired ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                            {expired ? "Expired" : daysLeft === 0 ? "Expires today" : `${daysLeft} days left`}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
        </div>

        {/* Recent dispatches */}
        <Panel title="Recent dispatches" subtitle="Click a row to see the delivery details" icon={ClipboardList}>
          {data.recentLoadings.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No dispatches recorded yet</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[377px]">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-stone-50 border-b border-stone-200 sticky top-0 z-10">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">Loading</th>
                    <th className="px-4 py-2.5 font-semibold">Route</th>
                    <th className="px-4 py-2.5 font-semibold">Truck</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.recentLoadings.map((record) => {
                    const status = STATUS_META[record.status] ?? STATUS_META.pending;
                    return (
                      <tr
                        key={record.id}
                        onClick={() => navigate(`/supply-invoices?tab=loading&loadingId=${record.id}`)}
                        className="hover:bg-stone-50 transition-colors cursor-pointer"
                        title="View delivery details"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-slate-800">{record.load_number}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {(record.loading_items?.length ?? 0).toLocaleString()} product lines
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-700">
                          {record.route?.route_code || record.route?.name || "Not set"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {record.truck?.licence_plate_no || record.truck?.truck_number || "Not set"}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                          {formatDate(record.loading_date || record.prepared_date)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex px-2 py-1 rounded-md border text-[11px] font-semibold whitespace-nowrap ${status.badge}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
