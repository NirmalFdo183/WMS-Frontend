import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Calendar,
  TrendingUp,
  Package,
  Truck,
  ShoppingCart,
  CreditCard,
  Wallet,
  RefreshCw,
  AlertCircle,
  Award,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Data Interfaces
interface SaleItem {
  id?: number;
  product_id: number;
  batch_id?: number | null;
  qty: number;
  unit_price: number;
  retail_price?: number;
  total: number;
  discount?: number;
  product?: {
    id: number;
    name: string;
    material_code?: string;
    barcode?: string;
  };
  batchStock?: {
    id: number;
    netprice?: number;
    retail_price?: number;
  };
}

interface Sale {
  id: number;
  date_time: string;
  user_id: number;
  total: number;
  discount: number;
  payment_type?: "cash" | "card" | string;
  items?: SaleItem[];
  user?: {
    id: number;
    name: string;
    username: string;
  };
}

interface SupplierInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_bill_amount: number;
  supplier?: {
    id: number;
    name: string;
  };
}

interface LoadingItem {
  id?: number;
  loading_id?: number;
  batch_id: number;
  qty: number;
  free_qty?: number;
  wh_price?: number;
  net_price?: number;
  batchStock?: {
    id: number;
    retail_price?: number;
    netprice?: number;
  };
}

interface LoadingDispatch {
  id: number;
  load_number: string;
  loading_date?: string;
  prepared_date?: string;
  created_at?: string;
  status: string;
  loadingItems?: LoadingItem[];
}

const formatCurrency = (amount: number) => {
  return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCompactCurrency = (amount: number) => {
  const num = Number(amount || 0);
  if (num >= 1_000_000) {
    return `LKR ${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `LKR ${(num / 1_000).toFixed(1)}k`;
  }
  return `LKR ${num.toFixed(0)}`;
};

// Vibrant accessible color palette for charts
const PIE_COLORS = [
  "#0f766e", // Teal 700
  "#0284c7", // Sky 600
  "#059669", // Emerald 600
  "#d97706", // Amber 600
  "#7c3aed", // Violet 600
  "#e11d48", // Rose 600
  "#4f46e5", // Indigo 600
  "#ea580c", // Orange 600
  "#0891b2", // Cyan 600
  "#65a30d", // Lime 600
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MonthlyReports: React.FC = () => {
  const today = new Date();
  const currentYearStr = String(today.getFullYear());
  const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Raw dataset states
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loadings, setLoadings] = useState<LoadingDispatch[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, invoicesRes, loadingsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/sales?limit=5000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/loadings?limit=1000`),
      ]);

      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setLoadings(Array.isArray(loadingsRes.data) ? loadingsRes.data : []);
    } catch (err: any) {
      console.error("Error loading monthly report datasets:", err);
      setError("Failed to fetch report datasets. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Available Years list from datasets
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    set.add(currentYearStr);
    set.add(String(Number(currentYearStr) - 1));

    sales.forEach((s) => {
      if (s.date_time) set.add(s.date_time.slice(0, 4));
    });
    invoices.forEach((inv) => {
      if (inv.invoice_date) set.add(inv.invoice_date.slice(0, 4));
    });
    loadings.forEach((ld) => {
      const d = ld.loading_date || ld.prepared_date || ld.created_at;
      if (d) set.add(d.slice(0, 4));
    });

    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [sales, invoices, loadings, currentYearStr]);

  // Selected period key, e.g. "2026-09"
  const targetPeriod = `${selectedYear}-${selectedMonth}`;

  // -------------------------------------------------------------
  // 1. Total Supplies for Selected Month
  // -------------------------------------------------------------
  const suppliesMetrics = useMemo(() => {
    const monthInvoices = invoices.filter((inv) => {
      return inv.invoice_date && inv.invoice_date.startsWith(targetPeriod);
    });

    const totalAmount = monthInvoices.reduce(
      (sum, inv) => sum + Number(inv.total_bill_amount || 0),
      0
    );

    return {
      count: monthInvoices.length,
      totalAmount,
    };
  }, [invoices, targetPeriod]);

  // -------------------------------------------------------------
  // 2. Total Deliveries / Loadings for Selected Month
  // -------------------------------------------------------------
  const deliveriesMetrics = useMemo(() => {
    const monthLoadings = loadings.filter((ld) => {
      const d = ld.loading_date || ld.prepared_date || ld.created_at;
      return d && d.startsWith(targetPeriod);
    });

    let totalAmount = 0;
    monthLoadings.forEach((ld) => {
      const items = ld.loadingItems || [];
      items.forEach((item) => {
        const unitVal =
          Number(item.wh_price) ||
          Number(item.net_price) ||
          Number(item.batchStock?.retail_price) ||
          0;
        totalAmount += Number(item.qty || 0) * unitVal;
      });
    });

    return {
      count: monthLoadings.length,
      totalAmount,
    };
  }, [loadings, targetPeriod]);

  // -------------------------------------------------------------
  // 3. POS Sales & Profit for Selected Month
  // -------------------------------------------------------------
  const posMetrics = useMemo(() => {
    const monthSales = sales.filter((s) => {
      return s.date_time && s.date_time.startsWith(targetPeriod);
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let cashAmount = 0;
    let cardAmount = 0;
    let cashCount = 0;
    let cardCount = 0;

    monthSales.forEach((sale) => {
      const rev = Number(sale.total || 0);
      totalRevenue += rev;

      // Track Payment Type Breakdown
      const pType = (sale.payment_type || "cash").toLowerCase();
      if (pType === "card") {
        cardAmount += rev;
        cardCount += 1;
      } else {
        cashAmount += rev;
        cashCount += 1;
      }

      // Cost of Goods Sold (COGS) Calculation
      let saleCost = 0;
      (sale.items || []).forEach((item) => {
        const qty = Number(item.qty || 0);
        // Unit cost from batchStock netprice (purchase cost)
        const unitCost =
          Number(item.batchStock?.netprice) > 0
            ? Number(item.batchStock?.netprice)
            : Number(item.retail_price || item.unit_price || 0) * 0.75; // 25% margin fallback if netprice unrecorded

        saleCost += qty * unitCost;
      });

      // Net profit for this sale
      const profit = Math.max(0, rev - saleCost);
      totalProfit += profit;
    });

    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      count: monthSales.length,
      totalRevenue,
      totalProfit,
      profitMargin,
      cashAmount,
      cardAmount,
      cashCount,
      cardCount,
      monthSales,
    };
  }, [sales, targetPeriod]);

  // -------------------------------------------------------------
  // 4. Pie Chart 1: Payment Method Breakdown (Cash vs Card)
  // -------------------------------------------------------------
  const paymentPieData = useMemo(() => {
    const total = posMetrics.cashAmount + posMetrics.cardAmount;
    if (total === 0) {
      return [];
    }

    return [
      {
        name: "Cash",
        value: posMetrics.cashAmount,
        count: posMetrics.cashCount,
        color: "#059669", // Emerald
        percentage: ((posMetrics.cashAmount / total) * 100).toFixed(1),
      },
      {
        name: "Card",
        value: posMetrics.cardAmount,
        count: posMetrics.cardCount,
        color: "#0284c7", // Sky Blue
        percentage: ((posMetrics.cardAmount / total) * 100).toFixed(1),
      },
    ];
  }, [posMetrics]);

  // -------------------------------------------------------------
  // 5. Pie Chart 2: Top 10 Most Sold Items in Month
  // -------------------------------------------------------------
  const top10ProductsData = useMemo(() => {
    // If no sales in current month, fallback to all-year sales for product distribution
    const sourceSales =
      posMetrics.monthSales.length > 0
        ? posMetrics.monthSales
        : sales.filter((s) => s.date_time && s.date_time.startsWith(selectedYear));

    const productMap = new Map<
      number,
      { name: string; qty: number; revenue: number }
    >();

    sourceSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const prodId = item.product_id;
        const name =
          item.product?.name || `Product #${prodId}`;
        const qty = Number(item.qty || 0);
        const lineTotal = Number(item.total || 0);

        if (!productMap.has(prodId)) {
          productMap.set(prodId, { name, qty: 0, revenue: 0 });
        }
        const existing = productMap.get(prodId)!;
        existing.qty += qty;
        existing.revenue += lineTotal;
      });
    });

    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const totalQty = sorted.reduce((sum, item) => sum + item.qty, 0);

    return sorted.map((p, idx) => ({
      name: p.name,
      value: p.qty,
      revenue: p.revenue,
      percentage: totalQty > 0 ? ((p.qty / totalQty) * 100).toFixed(1) : "0",
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [posMetrics.monthSales, sales, selectedYear]);

  // -------------------------------------------------------------
  // 6. Line Chart: POS Sales Growth Across Months (Year Trajectory)
  // -------------------------------------------------------------
  const monthlyGrowthData = useMemo(() => {
    const monthShorts = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize 12 months array for selectedYear
    return monthShorts.map((shortName, index) => {
      const monthNum = String(index + 1).padStart(2, "0");
      const prefix = `${selectedYear}-${monthNum}`;

      const monthSales = sales.filter((s) => s.date_time && s.date_time.startsWith(prefix));

      let monthRevenue = 0;
      let monthProfit = 0;

      monthSales.forEach((sale) => {
        const rev = Number(sale.total || 0);
        monthRevenue += rev;

        let saleCost = 0;
        (sale.items || []).forEach((item) => {
          const qty = Number(item.qty || 0);
          const unitCost =
            Number(item.batchStock?.netprice) > 0
              ? Number(item.batchStock?.netprice)
              : Number(item.retail_price || item.unit_price || 0) * 0.75;
          saleCost += qty * unitCost;
        });

        monthProfit += Math.max(0, rev - saleCost);
      });

      return {
        month: shortName,
        monthFull: MONTH_NAMES[index],
        salesAmount: monthRevenue,
        profitAmount: monthProfit,
        salesCount: monthSales.length,
      };
    });
  }, [sales, selectedYear]);

  return (
    <div className="min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* =========================================================
            HEADER & PERIOD SELECTOR
           ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="text-teal-800" size={30} />
              <span>Monthly Reports & Business Performance</span>
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Comprehensive analytics, supply costs, dispatches, POS revenue, and profit margins.
            </p>
          </div>

          {/* Period Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-stone-300 shadow-xs">
              <Calendar size={14} className="text-teal-800" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Month:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((name, i) => {
                  const val = String(i + 1).padStart(2, "0");
                  return (
                    <option key={val} value={val}>
                      {name} ({val})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-stone-300 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Year:
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Button: Current Month */}
            <button
              type="button"
              onClick={() => {
                setSelectedYear(currentYearStr);
                setSelectedMonth(currentMonthStr);
              }}
              className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer shadow-xs ${
                selectedYear === currentYearStr && selectedMonth === currentMonthStr
                  ? "bg-teal-800 text-white border-teal-800"
                  : "bg-white text-slate-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              Current Month
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Reload report data"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin text-teal-800" : "text-slate-600"}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="text-xs font-bold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Selected Period Badge */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-teal-50/70 border border-teal-200 px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-teal-800" />
            <span>
              Reporting Period:{" "}
              <strong className="text-teal-950 font-bold">
                {MONTH_NAMES[Number(selectedMonth) - 1]} {selectedYear}
              </strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-teal-800">
            Computed in real-time from active store database records
          </span>
        </div>

        {/* =========================================================
            1. FOUR KPI SUMMARY CARDS
           ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: Total Supplies for Month */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Supplies for Month
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                <Package size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(suppliesMetrics.totalAmount)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded border border-sky-200">
                  {suppliesMetrics.count} {suppliesMetrics.count === 1 ? "Supply Invoice" : "Supply Invoices"}
                </span>
                <span>received</span>
              </div>
            </div>
          </div>

          {/* CARD 2: Total Deliveries for Month */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Deliveries for Month
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <Truck size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(deliveriesMetrics.totalAmount)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
                  {deliveriesMetrics.count} {deliveriesMetrics.count === 1 ? "Delivery Load" : "Delivery Loads"}
                </span>
                <span>dispatched</span>
              </div>
            </div>
          </div>

          {/* CARD 3: Total POS Amount with count */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total POS Amount
              </span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 shrink-0">
                <ShoppingCart size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-teal-950 font-mono tracking-tight">
                {formatCurrency(posMetrics.totalRevenue)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="bg-teal-50 text-teal-900 font-bold px-2 py-0.5 rounded border border-teal-200">
                  {posMetrics.count} {posMetrics.count === 1 ? "POS Sale" : "POS Sales"}
                </span>
                <span>processed</span>
              </div>
            </div>
          </div>

          {/* CARD 4: Total Profit from POS with count */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Profit from POS
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-800 font-mono tracking-tight">
                {formatCurrency(posMetrics.totalProfit)}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                  {posMetrics.count} Sales
                </span>
                <span className="font-bold text-emerald-700">
                  {posMetrics.profitMargin.toFixed(1)}% margin
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            2. TWO PIE CHARTS (SIDE BY SIDE)
           ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PIE CHART 1: POS PAYMENT METHODS (CASH VS CARD) */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="text-teal-800" size={18} />
                  <span>POS Payment Methods (Card vs Cash)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of revenue collected via Cash vs Card payments in {MONTH_NAMES[Number(selectedMonth) - 1]} {selectedYear}.
                </p>
              </div>
              <span className="text-xs font-bold font-mono bg-stone-100 text-slate-700 px-2.5 py-1 rounded-md">
                {formatCurrency(posMetrics.totalRevenue)}
              </span>
            </div>

            {paymentPieData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <ShoppingCart size={32} className="opacity-40" />
                <p className="text-xs font-medium">No sales recorded in this month</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Pie visual */}
                <div className="w-full sm:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 text-[11px] space-y-0.5 pointer-events-none">
                                <p className="font-bold text-white leading-tight">
                                  {data.name} Payments
                                </p>
                                <div className="flex items-center gap-2 text-slate-300">
                                  <span className="font-mono text-teal-300 font-bold">
                                    {formatCurrency(data.value)}
                                  </span>
                                  <span>•</span>
                                  <span className="text-slate-400">
                                    {data.count} bills
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-semibold block">
                                  {data.percentage}% of month POS
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend & Breakdown stats */}
                <div className="w-full sm:w-1/2 space-y-3.5">
                  {paymentPieData.map((item) => (
                    <div
                      key={item.name}
                      className="p-3.5 rounded-xl border border-stone-100 bg-stone-50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            {item.name === "Cash" ? (
                              <Wallet size={14} className="text-emerald-700" />
                            ) : (
                              <CreditCard size={14} className="text-sky-700" />
                            )}
                            <span className="text-xs font-bold text-slate-900">
                              {item.name} Payments
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {item.count} transactions ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PIE CHART 2: TOP 10 MOST SOLD ITEMS */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="text-amber-600" size={18} />
                  <span>Top 10 Most Sold Items (by Quantity)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highest volume items sold through POS terminal.
                </p>
              </div>
              <span className="text-xs font-bold font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                Top 10 Volume
              </span>
            </div>

            {top10ProductsData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Package size={32} className="opacity-40" />
                <p className="text-xs font-medium">No item sales recorded</p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Pie visual */}
                <div className="w-full sm:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={top10ProductsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {top10ProductsData.map((entry, index) => (
                          <Cell key={`prod-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 text-[11px] space-y-0.5 pointer-events-none">
                                <p className="font-bold text-white max-w-[200px] truncate leading-tight">
                                  {data.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <span className="font-mono text-teal-300 font-bold">
                                    {data.value} units
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono text-amber-300">
                                    {formatCurrency(data.revenue)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 block">
                                  {data.percentage}% of top volume
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Items Scrollable List */}
                <div className="w-full sm:w-1/2 max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {top10ProductsData.map((prod, idx) => (
                    <div
                      key={prod.name}
                      className="p-2 rounded-lg border border-stone-100 bg-stone-50 flex items-center justify-between text-xs hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: prod.color }}
                        />
                        <span className="font-bold text-slate-900 truncate">
                          {idx + 1}. {prod.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-teal-900">
                          {prod.value} pcs
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {formatCompactCurrency(prod.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            3. LINE CHART: POS SALES & PROFIT GROWTH OVER MONTHS
           ========================================================= */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-teal-800" size={18} />
                <span>POS Sales & Profit Growth Across Months ({selectedYear})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of Gross Sales Amount vs Net Profit trajectory for each month in {selectedYear}.
              </p>
            </div>

            {/* Visual Legend indicator */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-700" />
                <span className="text-slate-800">Total Sales Amount (Teal)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-600" />
                <span className="text-slate-800">Total Profit (Amber)</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyGrowthData}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => formatCompactCurrency(val)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] space-y-1 border border-slate-700 pointer-events-none">
                          <p className="font-bold text-slate-200 border-b border-slate-800 pb-0.5">
                            {data.monthFull} {selectedYear} ({data.salesCount} sales)
                          </p>
                          <div className="flex justify-between gap-3 text-teal-300 font-semibold">
                            <span>Total Sales:</span>
                            <span className="font-mono">{formatCurrency(data.salesAmount)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-amber-400 font-semibold">
                            <span>Total Profit:</span>
                            <span className="font-mono">{formatCurrency(data.profitAmount)}</span>
                          </div>
                          {data.salesAmount > 0 && (
                            <div className="flex justify-between gap-3 text-slate-400 text-[10px] pt-0.5 border-t border-slate-800">
                              <span>Margin:</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {((data.profitAmount / data.salesAmount) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs font-bold text-slate-700 mr-4">
                      {value}
                    </span>
                  )}
                />
                {/* Line 1: Total Sales Amount (Teal) */}
                <Line
                  type="monotone"
                  dataKey="salesAmount"
                  name="Total POS Sales Amount"
                  stroke="#0f766e"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                />
                {/* Line 2: Total Profit (Amber / Gold) */}
                <Line
                  type="monotone"
                  dataKey="profitAmount"
                  name="Total Net Profit"
                  stroke="#d97706"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReports;
