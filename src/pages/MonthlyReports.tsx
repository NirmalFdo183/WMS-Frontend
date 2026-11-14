import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  Ban,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Minus,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  Truck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BatchStockReference {
  id: number;
  netprice?: number;
  retail_price?: number;
}

interface SaleItem {
  id?: number;
  product_id: number;
  qty: number;
  unit_price: number;
  retail_price?: number;
  total: number;
  product?: {
    id: number;
    name: string;
    material_code?: string;
  };
  batch_stock?: BatchStockReference;
  batchStock?: BatchStockReference;
}

interface Sale {
  id: number;
  date_time: string;
  total: number;
  payment_type?: "cash" | "card" | string;
  items?: SaleItem[];
}

interface SupplierInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_bill_amount: number;
}

interface LoadingItem {
  id?: number;
  qty: number;
  wh_price?: number;
  net_price?: number;
  batch_stock?: BatchStockReference;
  batchStock?: BatchStockReference;
}

interface LoadingDispatch {
  id: number;
  load_number: string;
  loading_date?: string;
  prepared_date?: string;
  created_at?: string;
  status: "pending" | "delivered" | "not_delivered" | string;
  loading_items?: LoadingItem[];
  loadingItems?: LoadingItem[];
}

interface PeriodMetrics {
  supplyCount: number;
  supplyAmount: number;
  dispatchCount: number;
  dispatchAmount: number;
  deliveredCount: number;
  pendingCount: number;
  cancelledCount: number;
  saleCount: number;
  salesRevenue: number;
  grossProfit: number;
  profitMargin: number;
  cashAmount: number;
  cashCount: number;
  cardAmount: number;
  cardCount: number;
  periodSales: Sale[];
}

type TrendDirection = "up" | "down" | "neutral";
type MetricTone = "sky" | "indigo" | "teal" | "emerald";

interface ReportMetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: MetricTone;
  change: { label: string; direction: TrendDirection };
  comparisonLabel: string;
}

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

const toneStyles: Record<MetricTone, string> = {
  sky: "bg-sky-50 border-sky-100 text-sky-700",
  indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
  teal: "bg-teal-50 border-teal-100 text-teal-800",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
};

const formatCurrency = (amount: number) =>
  `LKR ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCompactCurrency = (amount: number) => {
  const value = Number(amount || 0);
  return `LKR ${new Intl.NumberFormat("en-US", {
    notation: value >= 100000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(value)}`;
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
};

const getBatchStock = (item: SaleItem | LoadingItem) => item.batch_stock || item.batchStock;
const getLoadingItems = (loading: LoadingDispatch) => loading.loading_items || loading.loadingItems || [];

const calculateSaleProfit = (sale: Sale) => {
  const revenue = Number(sale.total || 0);
  const cost = (sale.items || []).reduce((sum, item) => {
    const batchCost = Number(getBatchStock(item)?.netprice || 0);
    const fallbackCost = Number(item.retail_price || item.unit_price || 0) * 0.75;
    return sum + Number(item.qty || 0) * (batchCost > 0 ? batchCost : fallbackCost);
  }, 0);
  return Math.max(0, revenue - cost);
};

const calculateChange = (current: number, previous: number) => {
  if (previous === 0 && current === 0) {
    return { label: "No change", direction: "neutral" as const };
  }
  if (previous === 0) {
    return { label: "New activity", direction: "up" as const };
  }
  const percentage = ((current - previous) / Math.abs(previous)) * 100;
  return {
    label: `${Math.abs(percentage).toFixed(1)}%`,
    direction: percentage > 0 ? ("up" as const) : percentage < 0 ? ("down" as const) : ("neutral" as const),
  };
};

const ReportMetricCard = ({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  change,
  comparisonLabel,
}: ReportMetricCardProps) => {
  const TrendIcon = change.direction === "up" ? TrendingUp : change.direction === "down" ? TrendingDown : Minus;
  const trendStyle =
    change.direction === "up"
      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
      : change.direction === "down"
        ? "text-red-700 bg-red-50 border-red-100"
        : "text-slate-600 bg-stone-50 border-stone-200";

  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1 truncate">{value}</p>
        </div>
        <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${toneStyles[tone]}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-2 truncate">{detail}</p>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${trendStyle}`}>
          <TrendIcon className="w-3 h-3" />
          {change.label}
        </span>
        <span className="text-[11px] text-slate-400">vs {comparisonLabel}</span>
      </div>
    </div>
  );
};

const MonthlyReports = () => {
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loadings, setLoadings] = useState<LoadingDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      const results = await Promise.allSettled([
        axios.get(`${baseUrl}/sales?limit=5000`),
        axios.get(`${baseUrl}/supplier-invoices`),
        axios.get(`${baseUrl}/loadings?limit=1000`),
      ]);
      const [salesResult, invoicesResult, loadingsResult] = results;
      const failed: string[] = [];

      if (salesResult.status === "fulfilled") setSales(extractArray<Sale>(salesResult.value.data));
      else failed.push("sales");
      if (invoicesResult.status === "fulfilled") setInvoices(extractArray<SupplierInvoice>(invoicesResult.value.data));
      else failed.push("supplies");
      if (loadingsResult.status === "fulfilled") setLoadings(extractArray<LoadingDispatch>(loadingsResult.value.data));
      else failed.push("dispatches");

      if (failed.length > 0) {
        setError(`Some ${failed.join(", ")} data could not be refreshed. Available sections are still shown.`);
      }
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error("Error loading monthly report datasets:", requestError);
      setError("Unable to load report data. Please check the connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set([currentYear, String(Number(currentYear) - 1)]);
    sales.forEach((sale) => sale.date_time && years.add(sale.date_time.slice(0, 4)));
    invoices.forEach((invoice) => invoice.invoice_date && years.add(invoice.invoice_date.slice(0, 4)));
    loadings.forEach((loadingRecord) => {
      const date = loadingRecord.loading_date || loadingRecord.prepared_date || loadingRecord.created_at;
      if (date) years.add(date.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [currentYear, invoices, loadings, sales]);

  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const previousPeriodDate = new Date(Number(selectedYear), Number(selectedMonth) - 2, 1);
  const previousYear = String(previousPeriodDate.getFullYear());
  const previousMonth = String(previousPeriodDate.getMonth() + 1).padStart(2, "0");
  const previousPeriod = `${previousYear}-${previousMonth}`;
  const selectedMonthName = MONTH_NAMES[Number(selectedMonth) - 1];
  const previousMonthLabel = `${MONTH_NAMES[Number(previousMonth) - 1]} ${previousYear}`;

  const metricsByPeriod = useMemo(() => {
    const calculate = (period: string): PeriodMetrics => {
      const periodInvoices = invoices.filter((invoice) => invoice.invoice_date?.startsWith(period));
      const periodLoadings = loadings.filter((loadingRecord) => {
        const date = loadingRecord.loading_date || loadingRecord.prepared_date || loadingRecord.created_at;
        return date?.startsWith(period);
      });
      const activeDispatches = periodLoadings.filter((loadingRecord) => loadingRecord.status !== "not_delivered");
      const periodSales = sales.filter((sale) => sale.date_time?.startsWith(period));

      const supplyAmount = periodInvoices.reduce((sum, invoice) => sum + Number(invoice.total_bill_amount || 0), 0);
      const dispatchAmount = activeDispatches.reduce(
        (total, loadingRecord) =>
          total +
          getLoadingItems(loadingRecord).reduce((sum, item) => {
            const batch = getBatchStock(item);
            const unitValue = Number(item.wh_price) || Number(item.net_price) || Number(batch?.retail_price) || 0;
            return sum + Number(item.qty || 0) * unitValue;
          }, 0),
        0,
      );

      let salesRevenue = 0;
      let grossProfit = 0;
      let cashAmount = 0;
      let cashCount = 0;
      let cardAmount = 0;
      let cardCount = 0;

      periodSales.forEach((sale) => {
        const revenue = Number(sale.total || 0);
        salesRevenue += revenue;
        grossProfit += calculateSaleProfit(sale);
        if ((sale.payment_type || "cash").toLowerCase() === "card") {
          cardAmount += revenue;
          cardCount += 1;
        } else {
          cashAmount += revenue;
          cashCount += 1;
        }
      });

      return {
        supplyCount: periodInvoices.length,
        supplyAmount,
        dispatchCount: activeDispatches.length,
        dispatchAmount,
        deliveredCount: periodLoadings.filter((record) => record.status === "delivered").length,
        pendingCount: periodLoadings.filter((record) => record.status === "pending").length,
        cancelledCount: periodLoadings.filter((record) => record.status === "not_delivered").length,
        saleCount: periodSales.length,
        salesRevenue,
        grossProfit,
        profitMargin: salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0,
        cashAmount,
        cashCount,
        cardAmount,
        cardCount,
        periodSales,
      };
    };

    return {
      current: calculate(selectedPeriod),
      previous: calculate(previousPeriod),
    };
  }, [invoices, loadings, previousPeriod, sales, selectedPeriod]);

  const currentMetrics = metricsByPeriod.current;
  const previousMetrics = metricsByPeriod.previous;

  const monthlyGrowthData = useMemo(() => {
    return MONTH_NAMES.map((monthName, index) => {
      const monthNumber = String(index + 1).padStart(2, "0");
      const prefix = `${selectedYear}-${monthNumber}`;
      const monthSales = sales.filter((sale) => sale.date_time?.startsWith(prefix));
      return {
        month: monthName.slice(0, 3),
        monthFull: monthName,
        salesAmount: monthSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        profitAmount: monthSales.reduce((sum, sale) => sum + calculateSaleProfit(sale), 0),
        salesCount: monthSales.length,
      };
    });
  }, [sales, selectedYear]);

  const paymentData = useMemo(() => {
    const total = currentMetrics.cashAmount + currentMetrics.cardAmount;
    if (total === 0) return [];
    return [
      {
        name: "Cash",
        value: currentMetrics.cashAmount,
        count: currentMetrics.cashCount,
        percentage: (currentMetrics.cashAmount / total) * 100,
        color: "#059669",
      },
      {
        name: "Card",
        value: currentMetrics.cardAmount,
        count: currentMetrics.cardCount,
        percentage: (currentMetrics.cardAmount / total) * 100,
        color: "#0284c7",
      },
    ];
  }, [currentMetrics]);

  const topProducts = useMemo(() => {
    const productMap = new Map<number, { name: string; code: string; qty: number; revenue: number }>();
    currentMetrics.periodSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const existing = productMap.get(item.product_id) || {
          name: item.product?.name || `Product #${item.product_id}`,
          code: item.product?.material_code || "No material code",
          qty: 0,
          revenue: 0,
        };
        existing.qty += Number(item.qty || 0);
        existing.revenue += Number(item.total || 0);
        productMap.set(item.product_id, existing);
      });
    });
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [currentMetrics.periodSales]);

  const salesHighlights = useMemo(() => {
    const dayMap = new Map<string, { count: number; revenue: number }>();
    currentMetrics.periodSales.forEach((sale) => {
      const day = sale.date_time.slice(0, 10);
      const existing = dayMap.get(day) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(sale.total || 0);
      dayMap.set(day, existing);
    });
    const bestDay = Array.from(dayMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue)[0];
    return {
      averageSale: currentMetrics.saleCount > 0 ? currentMetrics.salesRevenue / currentMetrics.saleCount : 0,
      bestDay: bestDay
        ? new Date(`${bestDay[0]}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit", month: "short" })
        : "No sales",
      bestDayRevenue: bestDay?.[1].revenue || 0,
    };
  }, [currentMetrics]);

  if (loading) {
    return (
      <div className="w-full min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-teal-700 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-600">Preparing monthly performance data...</p>
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
              <BarChart3 className="text-teal-800" size={30} />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Monthly Reports</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1.5 ml-10">Review purchasing, dispatch, sales, and profitability in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex self-start md:self-auto items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-slate-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-700" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <section className="bg-white rounded-xl border border-stone-200 shadow-xs p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Reporting period</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedMonthName} {selectedYear}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Report month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="px-3 py-2.5 text-sm rounded-lg border border-stone-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                {MONTH_NAMES.map((monthName, index) => {
                  const value = String(index + 1).padStart(2, "0");
                  return <option key={value} value={value}>{monthName}</option>;
                })}
              </select>
              <select
                aria-label="Report year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="px-3 py-2.5 text-sm rounded-lg border border-stone-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              >
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMonth(currentMonth);
                setSelectedYear(currentYear);
              }}
              className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                selectedMonth === currentMonth && selectedYear === currentYear
                  ? "bg-teal-50 border-teal-200 text-teal-900"
                  : "bg-white border-stone-200 text-slate-700 hover:bg-stone-50"
              }`}
            >
              Current month
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => fetchData(true)} className="font-semibold hover:underline self-start sm:self-auto">Try again</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportMetricCard
            label="Supplier purchases"
            value={formatCompactCurrency(currentMetrics.supplyAmount)}
            detail={`${currentMetrics.supplyCount} supply ${currentMetrics.supplyCount === 1 ? "invoice" : "invoices"}`}
            icon={Package}
            tone="sky"
            change={calculateChange(currentMetrics.supplyAmount, previousMetrics.supplyAmount)}
            comparisonLabel={previousMonthLabel}
          />
          <ReportMetricCard
            label="Active dispatch value"
            value={formatCompactCurrency(currentMetrics.dispatchAmount)}
            detail={`${currentMetrics.dispatchCount} delivered or pending ${currentMetrics.dispatchCount === 1 ? "load" : "loads"}`}
            icon={Truck}
            tone="indigo"
            change={calculateChange(currentMetrics.dispatchAmount, previousMetrics.dispatchAmount)}
            comparisonLabel={previousMonthLabel}
          />
          <ReportMetricCard
            label="POS revenue"
            value={formatCompactCurrency(currentMetrics.salesRevenue)}
            detail={`${currentMetrics.saleCount} completed ${currentMetrics.saleCount === 1 ? "sale" : "sales"}`}
            icon={ShoppingCart}
            tone="teal"
            change={calculateChange(currentMetrics.salesRevenue, previousMetrics.salesRevenue)}
            comparisonLabel={previousMonthLabel}
          />
          <ReportMetricCard
            label="Estimated gross profit"
            value={formatCompactCurrency(currentMetrics.grossProfit)}
            detail={`${currentMetrics.profitMargin.toFixed(1)}% gross margin`}
            icon={TrendingUp}
            tone="emerald"
            change={calculateChange(currentMetrics.grossProfit, previousMetrics.grossProfit)}
            comparisonLabel={previousMonthLabel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-800" />
                  <h2 className="text-base font-bold text-slate-900">Sales and profit trend</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Monthly POS performance across {selectedYear}</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-700" />Sales</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600" />Gross profit</span>
              </div>
            </div>
            <div className="h-80 w-full min-w-0 px-2 sm:px-4 py-5">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 720, height: 280 }}
              >
                <LineChart data={monthlyGrowthData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactCurrency} width={70} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as (typeof monthlyGrowthData)[number];
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
                          <p className="font-bold">{data.monthFull} {selectedYear}</p>
                          <p className="text-teal-300">Sales: {formatCurrency(data.salesAmount)}</p>
                          <p className="text-amber-300">Profit: {formatCurrency(data.profitAmount)}</p>
                          <p className="text-slate-400">{data.salesCount} transactions</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="salesAmount" stroke="#0f766e" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="profitAmount" stroke="#d97706" strokeWidth={3} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <aside className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-800" />
                <h2 className="text-base font-bold text-slate-900">Payment mix</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">POS revenue by payment method</p>
            </div>
            {paymentData.length === 0 ? (
              <div className="h-80 flex flex-col items-center justify-center text-center px-6">
                <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No POS payments</p>
                <p className="text-xs text-slate-500 mt-1">Payment details will appear when this period has sales.</p>
              </div>
            ) : (
              <div className="p-5">
                <div className="h-44 w-full min-w-0 relative">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    initialDimension={{ width: 260, height: 176 }}
                  >
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4}>
                        {paymentData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-slate-900">{currentMetrics.saleCount}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">sales</span>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {paymentData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 border border-stone-200 p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center" style={{ color: item.color }}>
                          {item.name === "Cash" ? <Wallet className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-500">{item.count} payments · {item.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{formatCompactCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-900">Top-selling products</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Ranked by units sold during {selectedMonthName}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">Top {topProducts.length || 0}</span>
            </div>
            {topProducts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No products sold in this period</p>
                <p className="text-xs text-slate-500 mt-1">Choose another month to view product performance.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {topProducts.map((product, index) => {
                  const maxQty = topProducts[0]?.qty || 1;
                  return (
                    <div key={`${product.name}-${index}`} className="px-5 py-3.5 flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        index < 3 ? "bg-amber-50 border border-amber-100 text-amber-700" : "bg-stone-100 text-slate-600"
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{product.code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900">{product.qty.toLocaleString()} units</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{formatCurrency(product.revenue)}</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-teal-700 rounded-full" style={{ width: `${Math.max((product.qty / maxQty) * 100, 4)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-teal-800" />
                <h2 className="text-base font-bold text-slate-900">Period snapshot</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">Operational details for this month</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-emerald-800">{currentMetrics.deliveredCount}</p>
                  <p className="text-[10px] text-emerald-700">Delivered</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                  <Clock3 className="w-4 h-4 text-amber-700 mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-amber-800">{currentMetrics.pendingCount}</p>
                  <p className="text-[10px] text-amber-700">Pending</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                  <Ban className="w-4 h-4 text-red-600 mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-red-700">{currentMetrics.cancelledCount}</p>
                  <p className="text-[10px] text-red-600">Cancelled</p>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Average POS sale</span>
                  <span className="font-bold text-slate-900">{formatCurrency(salesHighlights.averageSale)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Best sales day</span>
                  <span className="font-bold text-slate-900">{salesHighlights.bestDay}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Best-day revenue</span>
                  <span className="font-bold text-slate-900">{formatCurrency(salesHighlights.bestDayRevenue)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Supply invoices</span>
                  <span className="font-bold text-slate-900">{currentMetrics.supplyCount}</span>
                </div>
              </div>
              <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2.5 flex items-center gap-2 text-[11px] text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReports;
