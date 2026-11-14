import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Plus,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Truck,
  Undo2,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWarehouse } from "../context/WarehouseContext";

interface DashboardStats {
  low_stock_count: number;
}

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
  returned_qty?: number;
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

interface SaleRecord {
  id: number;
  date_time: string;
  total: number;
}

interface ReturnRecord {
  id: number;
  qty?: number;
  return_date?: string;
  created_at?: string;
}

interface AttentionItem {
  id: string;
  level: "critical" | "warning";
  title: string;
  detail: string;
  route: string;
  actionLabel: string;
  sortValue: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "teal" | "sky" | "amber" | "emerald";
  onClick: () => void;
}

const toneStyles = {
  teal: "bg-teal-50 border-teal-100 text-teal-800",
  sky: "bg-sky-50 border-sky-100 text-sky-700",
  amber: "bg-amber-50 border-amber-100 text-amber-700",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
};

const MetricCard = ({ label, value, detail, icon: Icon, tone, onClick }: MetricCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full bg-white p-4 rounded-xl border border-stone-200 shadow-xs text-left transition-all hover:border-stone-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/20"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums mt-1 truncate">
          {value}
        </p>
      </div>
      <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${toneStyles[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
    </div>
    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100">
      <span className="text-xs text-slate-500 truncate">{detail}</span>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 transition-colors shrink-0" />
    </div>
  </button>
);

const formatCurrency = (amount: number) =>
  `LKR ${Number.isFinite(amount) ? amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : "0.00"}`;

const formatCompactCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) return "LKR 0";
  return `LKR ${new Intl.NumberFormat("en-US", {
    notation: amount >= 100000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 100000 ? 1 : 0,
  }).format(amount)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isSameDay = (value: string | undefined, compareWith: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === compareWith.getFullYear() &&
    date.getMonth() === compareWith.getMonth() &&
    date.getDate() === compareWith.getDate()
  );
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshTotalValue } = useWarehouse();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchWarning, setFetchWarning] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [loadings, setLoadings] = useState<LoadingRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setFetchWarning(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const requests = [
      axios.get(`${baseUrl}/dashboard/stats`),
      axios.get(`${baseUrl}/products`),
      axios.get(`${baseUrl}/batch-stocks`),
      axios.get(`${baseUrl}/loadings?limit=100`),
      axios.get(`${baseUrl}/sales?limit=100`),
      axios.get(`${baseUrl}/returns`),
    ];

    try {
      const results = await Promise.allSettled(requests);
      const failedSections: string[] = [];
      const sectionNames = ["summary", "products", "stock", "dispatches", "sales", "returns"];
      results.forEach((result, index) => {
        if (result.status === "rejected") failedSections.push(sectionNames[index]);
      });

      const [statsResult, productsResult, batchesResult, loadingsResult, salesResult, returnsResult] = results;
      if (statsResult.status === "fulfilled") setStats(statsResult.value.data as DashboardStats);
      if (productsResult.status === "fulfilled") setProducts(extractArray<Product>(productsResult.value.data));
      if (batchesResult.status === "fulfilled") setBatches(extractArray<BatchStock>(batchesResult.value.data));
      if (loadingsResult.status === "fulfilled") setLoadings(extractArray<LoadingRecord>(loadingsResult.value.data));
      if (salesResult.status === "fulfilled") setSales(extractArray<SaleRecord>(salesResult.value.data));
      if (returnsResult.status === "fulfilled") setReturns(extractArray<ReturnRecord>(returnsResult.value.data));

      if (failedSections.length > 0) {
        setFetchWarning(`Some ${failedSections.join(", ")} data could not be refreshed.`);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setFetchWarning("The dashboard could not be refreshed. Showing the most recent available data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await Promise.all([fetchData(true), refreshTotalValue()]);
  };

  const dashboardData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const expiryLimit = new Date(todayStart);
    expiryLimit.setDate(expiryLimit.getDate() + 90);

    const stockUnits = batches.reduce((sum, batch) => sum + Math.max(Number(batch.remain_qty) || 0, 0), 0);
    const stockValue = batches.reduce(
      (sum, batch) => sum + Math.max(Number(batch.remain_qty) || 0, 0) * (Number(batch.netprice) || 0),
      0,
    );
    const returnedUnits = batches.reduce((sum, batch) => sum + Math.max(Number(batch.returned_qty) || 0, 0), 0);
    const activeProducts = products.filter((product) => (product.shelf_stock ?? product.total_units ?? 0) > 0).length;

    const pendingLoadings = loadings.filter((record) => record.status === "pending");
    const pendingUnits = pendingLoadings.reduce(
      (sum, record) => sum + (record.loading_items ?? []).reduce((itemSum, item) => itemSum + (Number(item.qty) || 0), 0),
      0,
    );

    const todaySales = sales.filter((sale) => isSameDay(sale.date_time, now));
    const todaySalesValue = todaySales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const weekSales = sales.filter((sale) => new Date(sale.date_time) >= weekStart);
    const weekSalesValue = weekSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const weekDelivered = loadings.filter((record) => {
      const date = record.loading_date ? new Date(record.loading_date) : null;
      return record.status === "delivered" && date && !Number.isNaN(date.getTime()) && date >= weekStart;
    });
    const weekReturns = returns.filter((record) => {
      const value = record.return_date || record.created_at;
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.getTime()) && date >= weekStart;
    });
    const weekReturnUnits = weekReturns.reduce((sum, record) => sum + (Number(record.qty) || 0), 0);

    const outOfStockProducts = products
      .filter((product) => (product.total_units ?? ((product.shelf_stock ?? 0) + (product.pending_stock ?? 0))) <= 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    const lowStockProducts = products
      .filter((product) => {
        const units = product.total_units ?? ((product.shelf_stock ?? 0) + (product.pending_stock ?? 0));
        return units > 0 && units <= 50;
      })
      .sort((a, b) => {
        const aUnits = a.total_units ?? ((a.shelf_stock ?? 0) + (a.pending_stock ?? 0));
        const bUnits = b.total_units ?? ((b.shelf_stock ?? 0) + (b.pending_stock ?? 0));
        return aUnits - bUnits;
      });

    const expiredBatches = batches
      .filter((batch) => {
        if (!batch.expiry_date || batch.remain_qty <= 0) return false;
        const expiry = new Date(batch.expiry_date);
        return !Number.isNaN(expiry.getTime()) && expiry < todayStart;
      })
      .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
    const expiringBatches = batches
      .filter((batch) => {
        if (!batch.expiry_date || batch.remain_qty <= 0) return false;
        const expiry = new Date(batch.expiry_date);
        return !Number.isNaN(expiry.getTime()) && expiry >= todayStart && expiry <= expiryLimit;
      })
      .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

    const attentionItems: AttentionItem[] = [
      ...expiredBatches.map((batch) => ({
        id: `expired-${batch.id}`,
        level: "critical" as const,
        title: `${batch.product?.name ?? "Stock batch"} has expired`,
        detail: `${batch.remain_qty.toLocaleString()} units · expired ${formatDate(batch.expiry_date)}`,
        route: "/products",
        actionLabel: "Review stock",
        sortValue: 0,
      })),
      ...outOfStockProducts.map((product) => ({
        id: `empty-${product.id}`,
        level: "critical" as const,
        title: `${product.name} is out of stock`,
        detail: `${product.material_code} · no available or allocated units`,
        route: "/products",
        actionLabel: "View product",
        sortValue: 1,
      })),
      ...expiringBatches.map((batch) => ({
        id: `expiring-${batch.id}`,
        level: "warning" as const,
        title: `${batch.product?.name ?? "Stock batch"} expires soon`,
        detail: `${batch.remain_qty.toLocaleString()} units · expires ${formatDate(batch.expiry_date)}`,
        route: "/products",
        actionLabel: "Review batch",
        sortValue: 2,
      })),
      ...lowStockProducts.map((product) => {
        const units = product.total_units ?? ((product.shelf_stock ?? 0) + (product.pending_stock ?? 0));
        return {
          id: `low-${product.id}`,
          level: "warning" as const,
          title: `${product.name} is running low`,
          detail: `${product.material_code} · ${units.toLocaleString()} units remaining`,
          route: "/products",
          actionLabel: "Plan supply",
          sortValue: 3,
        };
      }),
    ].sort((a, b) => a.sortValue - b.sortValue).slice(0, 6);

    const recentLoadings = [...loadings]
      .sort((a, b) => {
        const aDate = new Date(a.loading_date || a.prepared_date || 0).getTime();
        const bDate = new Date(b.loading_date || b.prepared_date || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 6);

    return {
      stockUnits,
      stockValue,
      returnedUnits,
      activeProducts,
      pendingLoadings,
      pendingUnits,
      todaySales,
      todaySalesValue,
      weekSales,
      weekSalesValue,
      weekDelivered,
      weekReturnUnits,
      outOfStockProducts,
      lowStockProducts,
      expiredBatches,
      expiringBatches,
      attentionItems,
      recentLoadings,
    };
  }, [batches, loadings, products, returns, sales]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="text-teal-800" size={30} />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Warehouse Dashboard
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1.5 ml-10">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"}. Here is what needs your attention today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Clock3 className="w-3.5 h-3.5" />
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            <button
              type="button"
              onClick={() => navigate("/new-supply")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold shadow-xs transition-colors focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Supply</span>
              <span className="sm:hidden">Supply</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Stock on hand"
            value={`${dashboardData.stockUnits.toLocaleString()} units`}
            detail={`${dashboardData.activeProducts.toLocaleString()} products currently available`}
            icon={Boxes}
            tone="teal"
            onClick={() => navigate("/products")}
          />
          <MetricCard
            label="Current stock value"
            value={formatCompactCurrency(dashboardData.stockValue)}
            detail="Based on remaining units at net cost"
            icon={WalletCards}
            tone="sky"
            onClick={() => navigate("/products")}
          />
          <MetricCard
            label="Pending dispatches"
            value={dashboardData.pendingLoadings.length.toLocaleString()}
            detail={`${dashboardData.pendingUnits.toLocaleString()} units allocated to trucks`}
            icon={Truck}
            tone={dashboardData.pendingLoadings.length > 0 ? "amber" : "teal"}
            onClick={() => navigate("/supply-invoices?tab=loading")}
          />
          <MetricCard
            label="Today's POS sales"
            value={formatCompactCurrency(dashboardData.todaySalesValue)}
            detail={`${dashboardData.todaySales.length.toLocaleString()} transactions completed`}
            icon={ShoppingCart}
            tone="emerald"
            onClick={() => navigate("/supply-invoices?tab=sales")}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">Needs attention</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Stock risks ordered by urgency</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1"
              >
                Open inventory <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dashboardData.attentionItems.length === 0 ? (
              <div className="px-5 py-12 flex flex-col items-center text-center">
                <span className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-bold text-slate-800">Warehouse stock looks healthy</h3>
                <p className="text-xs text-slate-500 mt-1">No expired, expiring, low-stock, or empty products need action.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {dashboardData.attentionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-stone-50 transition-colors group"
                  >
                    <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                      item.level === "critical"
                        ? "bg-red-50 border-red-100 text-red-600"
                        : "bg-amber-50 border-amber-100 text-amber-700"
                    }`}>
                      {item.level === "critical" ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 truncate">{item.title}</span>
                      <span className="block text-xs text-slate-500 mt-0.5 truncate">{item.detail}</span>
                    </span>
                    <span className="hidden sm:inline text-xs font-semibold text-slate-500 group-hover:text-teal-800 shrink-0">
                      {item.actionLabel}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <h2 className="text-base font-bold text-slate-900">Quick actions</h2>
              <p className="text-xs text-slate-500 mt-1">Common warehouse tasks</p>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: "Record a new supply", detail: "Receive supplier stock", icon: Plus, route: "/new-supply" },
                { label: "Create a loading", detail: "Prepare a truck dispatch", icon: Truck, route: "/loading" },
                { label: "Process a return", detail: "Put returned goods back in stock", icon: RotateCcw, route: "/returns" },
                { label: "Open POS terminal", detail: "Start a counter sale", icon: ShoppingCart, route: "/pos" },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.route)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-stone-50 transition-colors group"
                >
                  <span className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <action.icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{action.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5 truncate">{action.detail}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 shrink-0" />
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-800" />
                  <h2 className="text-base font-bold text-slate-900">Recent dispatches</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Latest truck loading activity</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/supply-invoices?tab=loading")}
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dashboardData.recentLoadings.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No dispatches recorded yet</p>
                <button type="button" onClick={() => navigate("/loading")} className="text-xs font-semibold text-teal-800 mt-2 hover:underline">
                  Create the first loading
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3 font-semibold">Loading</th>
                      <th className="px-4 py-3 font-semibold">Route / truck</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {dashboardData.recentLoadings.map((record) => {
                      const routeLabel = record.route?.route_code || record.route?.name || "Route not set";
                      const truckLabel = record.truck?.licence_plate_no || record.truck?.truck_number || "Truck not set";
                      const statusStyle =
                        record.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : record.status === "not_delivered"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";
                      return (
                        <tr key={record.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-slate-800">{record.load_number}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {(record.loading_items?.length ?? 0).toLocaleString()} product lines
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-slate-700">{routeLabel}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{truckLabel}</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                            {formatDate(record.loading_date || record.prepared_date)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`inline-flex px-2 py-1 rounded-md border text-[11px] font-semibold capitalize whitespace-nowrap ${statusStyle}`}>
                              {record.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-teal-800" />
                <h2 className="text-base font-bold text-slate-900">Last 7 days</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">A quick operational pulse</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500">POS revenue</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{formatCurrency(dashboardData.weekSalesValue)}</p>
                <p className="text-xs text-slate-500 mt-1">{dashboardData.weekSales.length} transactions</p>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
                  <Truck className="w-4 h-4 text-teal-800 mb-2" />
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{dashboardData.weekDelivered.length}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Delivered loads</p>
                </div>
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
                  <Undo2 className="w-4 h-4 text-teal-800 mb-2" />
                  <p className="text-lg font-bold text-slate-900 tabular-nums">{dashboardData.weekReturnUnits}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Returned units</p>
                </div>
              </div>
              <div className="rounded-lg bg-teal-50 border border-teal-100 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-teal-950">Returned stock available</p>
                  <p className="text-[11px] text-teal-800 mt-0.5">Prioritized for the next sale</p>
                </div>
                <span className="text-lg font-bold text-teal-900 tabular-nums">{dashboardData.returnedUnits}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/monthly-reports")}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-slate-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
              >
                Open full reports <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Out of stock", value: dashboardData.outOfStockProducts.length, color: "text-red-600" },
            { label: "Low stock", value: stats?.low_stock_count ?? dashboardData.lowStockProducts.length, color: "text-amber-700" },
            { label: "Expiring soon", value: dashboardData.expiringBatches.length, color: "text-amber-700" },
            { label: "Expired batches", value: dashboardData.expiredBatches.length, color: "text-red-600" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate("/products")}
              className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-left hover:border-stone-300 transition-colors"
            >
              <p className={`text-xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
