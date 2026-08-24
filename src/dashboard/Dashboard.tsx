import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ChevronRight,
  Clock,
  ArrowRight,
  Truck,
  RotateCcw,
  AlertCircle,
  Search,
} from "lucide-react";

interface BatchStock {
  id: number;
  remain_qty: number;
  returned_qty?: number;
  retail_price: number;
  netprice: number;
  expiry_date?: string;
  pack_size: number;
  product?: {
    id: number;
    name: string;
    material_code: string;
    category?: string;
  };
}

interface LoadingItem {
  id: number;
  load_number: string;
  loading_date?: string;
  prepared_date?: string;
  status: "pending" | "delivered" | "not_delivered";
  route?: { name: string };
  truck?: { truck_number: string };
  driver?: { name: string };
  salesRep?: { name: string };
  loading_items?: any[];
}

interface SaleRecord {
  id: number;
  date_time: string;
  payment_type: "cash" | "card";
  total: number;
  user?: { name: string };
  items?: any[];
}

interface ReturnRecord {
  id: number;
  return_number?: string;
  reason?: string;
  created_at: string;
  status?: string;
  loading_id?: number;
}

const formatCurrency = (amount: number): string => {
  const safeNum = isNaN(amount) ? 0 : amount;
  return `LKR ${safeNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPackaging = (units: number, packSize: number = 1): string => {
  const safePack = packSize > 0 ? packSize : 1;
  const cases = Math.floor(units / safePack);
  const loose = units % safePack;
  if (cases > 0 && loose > 0) {
    return `${cases} cs + ${loose} loose · ${units} units (${safePack}/cs)`;
  }
  if (cases > 0) {
    return `${cases} cases · ${units} units (${safePack}/cs)`;
  }
  return `${loose} loose units · ${units} total`;
};

type PeriodFilter = "today" | "week" | "month" | "all";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { totalValue, refreshTotalValue } = useWarehouse();

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Date Filter State
  const [period, setPeriod] = useState<PeriodFilter>("month");

  // Raw API Datasets
  const [stats, setStats] = useState<any | null>(null);
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [loadings, setLoadings] = useState<LoadingItem[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  // Loadings Table Controls
  const [loadingSearch, setLoadingSearch] = useState("");
  const [loadingStatusFilter, setLoadingStatusFilter] = useState<string>("all");

  // Fetch all dashboard operational data
  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setFetchError(null);

      const [statsRes, batchesRes, loadingsRes, salesRes, returnsRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/loadings`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/sales`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/returns`),
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (batchesRes.status === "fulfilled") setBatches(batchesRes.value.data || []);
      if (loadingsRes.status === "fulfilled") setLoadings(loadingsRes.value.data || []);
      if (salesRes.status === "fulfilled") setSales(salesRes.value.data || []);
      if (returnsRes.status === "fulfilled") setReturns(returnsRes.value.data || []);

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setFetchError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualRefresh = async () => {
    await Promise.all([fetchData(true), refreshTotalValue()]);
  };

  // Time freshness text
  const [freshnessText, setFreshnessText] = useState("Updated just now");
  useEffect(() => {
    const updateFreshness = () => {
      const diffMs = Date.now() - lastUpdated.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) setFreshnessText("Updated just now");
      else if (diffMins === 1) setFreshnessText("Updated 1 min ago");
      else setFreshnessText(`Updated ${diffMins} mins ago`);
    };
    updateFreshness();
    const interval = setInterval(updateFreshness, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Date Filter Calculations
  const periodCutoffDate = useMemo(() => {
    if (period === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === "month") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    }
    return null; // All time
  }, [period]);

  // Filtered Operational Data
  const periodDeliveredLoadings = useMemo(() => {
    return loadings.filter((l) => {
      if (l.status !== "delivered") return false;
      if (!periodCutoffDate) return true;
      const date = l.loading_date ? new Date(l.loading_date) : null;
      return date ? date >= periodCutoffDate : true;
    });
  }, [loadings, periodCutoffDate]);

  // "Needs Attention" Calculations
  // 1. Low stock items (remain_qty <= 50)
  const lowStockItems = useMemo(() => {
    return batches
      .filter((b) => b.remain_qty > 0 && b.remain_qty <= 50 && b.product)
      .sort((a, b) => a.remain_qty - b.remain_qty)
      .slice(0, 6);
  }, [batches]);

  // 2. Near-expiry batches (expiring within 90 days)
  const nearExpiryBatches = useMemo(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + 90);

    return batches
      .filter((b) => {
        if (!b.expiry_date || b.remain_qty <= 0) return false;
        const exp = new Date(b.expiry_date);
        return exp >= now && exp <= limit;
      })
      .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
      .slice(0, 6);
  }, [batches]);

  // 3. Pending Loadings
  const pendingLoadings = useMemo(() => {
    return loadings.filter((l) => l.status === "pending").slice(0, 6);
  }, [loadings]);

  // 4. Pending Returns
  const pendingReturns = useMemo(() => {
    return returns.filter((r) => !r.status || r.status.toLowerCase() === "pending").slice(0, 6);
  }, [returns]);

  // Filtered Loadings for Table
  const filteredLoadingsTable = useMemo(() => {
    return loadings.filter((l) => {
      const matchSearch =
        loadingSearch === "" ||
        l.load_number?.toLowerCase().includes(loadingSearch.toLowerCase()) ||
        l.route?.name?.toLowerCase().includes(loadingSearch.toLowerCase()) ||
        l.driver?.name?.toLowerCase().includes(loadingSearch.toLowerCase());
      const matchStatus =
        loadingStatusFilter === "all" || l.status === loadingStatusFilter;
      return matchSearch && matchStatus;
    }).slice(0, 6);
  }, [loadings, loadingSearch, loadingStatusFilter]);

  const recentSalesList = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
      .slice(0, 6);
  }, [sales]);

  const dashboardModules = [
    {
      title: "Stock Management",
      description: "Manage catalog, batches, SKU codes, and physical inventory levels.",
      icon: <Package className="w-5 h-5 text-teal-800" />,
      link: "/products",
    },
    {
      title: "Loading Manifests",
      description: "Dispatch outbound truck delivery manifests and monitor driver runs.",
      icon: <Truck className="w-5 h-5 text-teal-800" />,
      link: "/supply-invoices?tab=loading",
    },
    {
      title: "Supplier Invoices",
      description: "Review incoming supplier bills and track warehouse purchasing costs.",
      icon: <TrendingUp className="w-5 h-5 text-teal-800" />,
      link: "/supply-invoices?tab=supply",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-teal-800 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading warehouse records...</span>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header & Operational Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-stone-200 rounded-lg p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Warehouse Dashboard
            </h1>
            <span className="bg-stone-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-stone-200">
              Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{user?.name || "Administrator"}</span>. Current inventory position, pending tasks, and recent warehouse activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter Tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-md border border-stone-200">
            {(["today", "week", "month", "all"] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors capitalize focus:outline-none focus:ring-2 focus:ring-teal-700/50 ${
                  period === p
                    ? "bg-white text-teal-900 font-bold shadow-xs border border-stone-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p === "all" ? "All time" : p === "today" ? "Today" : `This ${p}`}
              </button>
            ))}
          </div>

          {/* Freshness & Refresh Button */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={13} className="text-slate-400" />
              <span>{freshnessText}</span>
            </span>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 rounded-md text-xs font-semibold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700/50 disabled:opacity-50"
              title="Refresh all operational datasets"
            >
              <RotateCcw size={13} className={refreshing ? "animate-spin text-teal-800" : "text-slate-500"} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {/* Quick POS Terminal Shortcut */}
          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-md text-xs font-semibold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          >
            <ShoppingCart size={14} />
            <span>Open POS</span>
          </button>
        </div>
      </div>

      {/* Error state banner if fetch failed */}
      {fetchError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>Couldn't load some dashboard records. Displaying cached data.</span>
          </div>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="font-bold underline hover:text-amber-950 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Metrics & Snapshot Strip */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Operational Summary
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Snapshot values vs period activity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Snapshot 1: Current Warehouse Value */}
          <div
            onClick={() => navigate("/products")}
            className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg p-4 transition-colors shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
                Current Snapshot
              </span>
              <span className="text-[11px] text-teal-800 font-bold group-hover:underline flex items-center gap-0.5">
                Catalog <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700">Warehouse Inventory Value</p>
            <h3 className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
              {formatCurrency(totalValue)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Active stock across all batches
            </p>
          </div>

          {/* Snapshot 2: Low Stock Count */}
          <div
            onClick={() => navigate("/products")}
            className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg p-4 transition-colors shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
                Threshold Alert
              </span>
              <span className="text-[11px] text-teal-800 font-bold group-hover:underline flex items-center gap-0.5">
                Restock <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700">Low Stock Products</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-lg font-bold text-slate-900 tabular-nums">
                {stats?.low_stock_count || lowStockItems.length}
              </h3>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ≤ 50 Units
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Items requiring replenishment
            </p>
          </div>

          {/* Period Metric 3: Delivered Loadings Revenue */}
          <div
            onClick={() => navigate("/supply-invoices?tab=loading")}
            className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg p-4 transition-colors shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 capitalize">
                {period === "all" ? "All Time" : `This ${period}`}
              </span>
              <span className="text-[11px] text-teal-800 font-bold group-hover:underline flex items-center gap-0.5">
                Manifests <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700">Delivered Manifests</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-lg font-bold text-slate-900 tabular-nums">
                {periodDeliveredLoadings.length}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                loads completed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
              Billed: {formatCurrency(stats?.total_revenue || 0)}
            </p>
          </div>

          {/* Period Metric 4: Total Commission Profit */}
          <div
            onClick={() => navigate("/supply-invoices?tab=supply")}
            className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg p-4 transition-colors shadow-xs cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 capitalize">
                {period === "all" ? "All Time" : `This ${period}`}
              </span>
              <span className="text-[11px] text-teal-800 font-bold group-hover:underline flex items-center gap-0.5">
                Supplies <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-700">Commission (5% Profit)</p>
            <h3 className="text-lg font-bold text-teal-900 font-mono tabular-nums mt-1">
              {formatCurrency(stats?.total_profit || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
              From {formatCurrency(stats?.total_supply_cost || 0)} supply
            </p>
          </div>
        </div>
      </div>

      {/* 3. Operational Section: "Needs Attention" */}
      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Needs Attention</h2>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {lowStockItems.length + nearExpiryBatches.length + pendingLoadings.length + pendingReturns.length} active
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Prioritized items requiring replenishment, batch inspection, or dispatch
          </p>
        </div>

        <div className="divide-y divide-stone-100">
          {/* Low Stock Items */}
          {lowStockItems.length > 0 && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Low Stock Products (≤ 50 Units Available)
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  View All Products &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {lowStockItems.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => navigate("/products")}
                    className="p-3 rounded-md border border-stone-200 hover:border-teal-700/60 transition-colors bg-stone-50/50 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">
                        {batch.product?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        SKU: {batch.product?.material_code} · Batch #{batch.id}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-stone-200/70 flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 tabular-nums">
                        {formatPackaging(batch.remain_qty, batch.pack_size)}
                      </span>
                      <span className="text-[11px] font-bold text-teal-800 hover:underline">
                        Restock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near-Expiry Batches */}
          {nearExpiryBatches.length > 0 && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Batches Expiring Within 90 Days
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/products")}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  Review Batches &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {nearExpiryBatches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => navigate("/products")}
                    className="p-3 rounded-md border border-amber-200/70 hover:border-teal-700/60 transition-colors bg-amber-50/30 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">
                        {batch.product?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Expires: {batch.expiry_date} · Batch #{batch.id}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 tabular-nums">
                        {formatPackaging(batch.remain_qty, batch.pack_size)}
                      </span>
                      <span className="text-[11px] font-bold text-teal-800 hover:underline">
                        Inspect
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active / Pending Loadings */}
          {pendingLoadings.length > 0 && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Pending Outbound Loadings Awaiting Dispatch
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/loading")}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  Open Loadings &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {pendingLoadings.map((load) => (
                  <div
                    key={load.id}
                    onClick={() => navigate("/loading")}
                    className="p-3 rounded-md border border-stone-200 hover:border-teal-700/60 transition-colors bg-stone-50/50 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {load.load_number}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Route: {load.route?.name || "Unassigned"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Driver: {load.driver?.name || "Unassigned"} · Rep: {load.salesRep?.name || "Unassigned"}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        {load.loading_items?.length || 0} product lines
                      </span>
                      <span className="font-bold text-teal-800 hover:underline">
                        Manage Load
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All clear state */}
          {lowStockItems.length === 0 && nearExpiryBatches.length === 0 && pendingLoadings.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <p className="text-xs font-semibold text-slate-700">No Urgent Operational Attention Required</p>
              <p className="text-[11px] text-slate-400 mt-1">All inventory thresholds and pending dispatch queues are healthy.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Active Work Area: Loadings & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loadings Manifests Queue (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Loadings & Manifests</h3>
                <p className="text-xs text-slate-500">Outbound manifests with route and assigned crew</p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter manifests..."
                    value={loadingSearch}
                    onChange={(e) => setLoadingSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-stone-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <select
                  value={loadingStatusFilter}
                  onChange={(e) => setLoadingStatusFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-stone-300 rounded text-xs text-slate-700 focus:outline-none focus:border-teal-700"
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-slate-500 border-b border-stone-200 font-semibold">
                    <th className="py-2.5 px-4">Load #</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3">Crew</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Lines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLoadingsTable.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No manifests found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLoadingsTable.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => navigate("/supply-invoices?tab=loading")}
                        className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                          {l.load_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {l.route?.name || "Unassigned"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {l.driver?.name || "No Driver"} · {l.salesRep?.name || "No Rep"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              l.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                          {l.loading_items?.length || 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border-t border-stone-200 bg-stone-50/50 flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/loading")}
              className="text-xs font-bold text-teal-800 hover:underline inline-flex items-center gap-1"
            >
              Manage Loadings <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Recent Direct Sales (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Direct Sales</h3>
                <p className="text-xs text-slate-500">Counter and POS receipts</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/sales")}
                className="text-xs font-bold text-teal-800 hover:underline"
              >
                Register &rarr;
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {recentSalesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No sales recorded yet.
                </div>
              ) : (
                recentSalesList.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => navigate("/sales")}
                    className="p-3 hover:bg-stone-50/70 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900 font-mono">
                        Sale #{sale.id.toString().padStart(5, "0")}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(sale.date_time).toLocaleDateString()} · {sale.payment_type.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 font-mono tabular-nums">
                        {formatCurrency(Number(sale.total))}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Paid
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border-t border-stone-200 bg-stone-50/50 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">
              {sales.length} total sales
            </span>
            <button
              type="button"
              onClick={() => navigate("/pos")}
              className="font-bold text-teal-800 hover:underline"
            >
              Launch POS &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 5. Compact System Modules Navigation */}
      <div>
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
          System Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {dashboardModules.map((mod, i) => (
            <div
              key={i}
              onClick={() => navigate(mod.link)}
              className="p-4 bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg transition-colors shadow-xs flex items-start gap-3.5 cursor-pointer group"
            >
              <div className="p-2.5 rounded-md bg-stone-100 group-hover:bg-teal-50 transition-colors shrink-0">
                {mod.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-900 transition-colors flex items-center gap-1">
                  <span>{mod.title}</span>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-teal-800 transition-transform group-hover:translate-x-0.5" />
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {mod.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
