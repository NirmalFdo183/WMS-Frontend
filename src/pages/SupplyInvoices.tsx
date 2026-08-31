import React, { useState, useEffect, useMemo } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  X,
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Loader2,
  FileText,
  Truck,
  ShoppingCart,
  Store,
  Layers,
  CheckCircle2,
  Plus,
} from "lucide-react";

interface ProductInfo {
  name: string;
  material_code: string;
  barcode: string;
}

interface BatchStock {
  id: number;
  product: ProductInfo;
  no_cases: number;
  pack_size: number;
  remain_qty: number;
  free_qty: number;
  extra_units: number;
  retail_price: number;
  netprice: number;
  expiry_date: string;
}

interface SupplierInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_bill_amount: number;
  supplier_id: number;
  supplier?: {
    name: string;
  };
  batch_stocks?: BatchStock[];
}

const PAGE_SIZE = 20;

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const formatCurrency = (amount: number): string => {
  const safe = isNaN(amount) ? 0 : amount;
  return `LKR ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const brandMapping: Record<string, string> = {
  BC: "BABY CHERAMY",
  CL: "CLOGARD",
  DV: "DIVA",
  DX: "DANDEX",
  FM: "FEMS",
  KM: "KUMARIKA",
  GL: "GOLD",
  GY: "GOYA",
  VV: "VELVET",
  HE: "HEMAS",
};

const SupplyInvoices: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalValue, refreshTotalValue } = useWarehouse();

  // Data State
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loadings, setLoadings] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState<
    "supply" | "shop" | "loading" | "sales"
  >("supply");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Active Record Selection
  const [selectedInvoice, setSelectedInvoice] =
    useState<SupplierInvoice | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState<any | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [statusConfirmation, setStatusConfirmation] = useState<{
    id: number;
    status: string;
  } | null>(null);

  // Returns State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnLoadingId, setReturnLoadingId] = useState<number | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<{
    [key: number]: string;
  }>({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Print Mode State: "supply-invoice" | "supply-report" | "load-list" | null
  const [printMode, setPrintMode] = useState<
    "supply-invoice" | "supply-report" | "load-list" | null
  >(null);
  const [printableInvoice, setPrintableInvoice] =
    useState<SupplierInvoice | null>(null);

  // Initial Tab Selection from Navigation State or Query Params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam && (tabParam === "supply" || tabParam === "loading")) {
      setActiveTab(tabParam as "supply" | "loading");
    } else if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonth, selectedYear, activeTab]);

  // Fetch Invoices, Loadings, and Sales
  const fetchInvoices = async () => {
    setLoading(true);
    setLoadingError(null);

    try {
      const [supplyRes, loadingRes, salesRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/loadings`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/sales`),
      ]);

      if (supplyRes.status === "fulfilled") {
        setInvoices(Array.isArray(supplyRes.value.data) ? supplyRes.value.data : []);
      } else {
        console.error("Error fetching supply invoices:", supplyRes.reason);
      }

      if (loadingRes.status === "fulfilled") {
        setLoadings(Array.isArray(loadingRes.value.data) ? loadingRes.value.data : []);
      } else {
        console.error("Error fetching loadings:", loadingRes.reason);
        setLoadingError("Failed to load manifests from server.");
      }

      if (salesRes.status === "fulfilled") {
        setSales(Array.isArray(salesRes.value.data) ? salesRes.value.data : []);
      } else {
        console.error("Error fetching sales:", salesRes.reason);
      }
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Compute available years dynamically
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);

    invoices.forEach((inv) => {
      if (inv.invoice_date) {
        const y = inv.invoice_date.split("-")[0];
        if (y && y.length === 4) years.add(y);
      }
    });

    loadings.forEach((load) => {
      if (load.loading_date) {
        const y = load.loading_date.split("-")[0];
        if (y && y.length === 4) years.add(y);
      }
    });

    sales.forEach((s) => {
      if (s.date_time) {
        const y = new Date(s.date_time).getFullYear().toString();
        if (y && y.length === 4) years.add(y);
      }
    });

    return Array.from(years).sort().reverse();
  }, [invoices, loadings, sales]);

  // Filtered Supply Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(q));

      const matchesYear =
        selectedYear === "all" ||
        (inv.invoice_date && inv.invoice_date.startsWith(selectedYear));

      const matchesMonth =
        selectedMonth === "all" ||
        (inv.invoice_date && inv.invoice_date.split("-")[1] === selectedMonth);

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [invoices, searchTerm, selectedYear, selectedMonth]);

  // Paginated Supply Invoices
  const totalSupplyPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, currentPage]);

  // Filtered Loading Manifests
  const filteredLoadings = useMemo(() => {
    return loadings.filter((load) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        load.load_number?.toLowerCase().includes(q) ||
        load.truck?.licence_plate_no?.toLowerCase().includes(q) ||
        load.route?.route_code?.toLowerCase().includes(q) ||
        load.sales_rep?.name?.toLowerCase().includes(q);

      const matchesYear =
        selectedYear === "all" ||
        (load.loading_date && load.loading_date.startsWith(selectedYear));

      const matchesMonth =
        selectedMonth === "all" ||
        (load.loading_date && load.loading_date.split("-")[1] === selectedMonth);

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [loadings, searchTerm, selectedYear, selectedMonth]);

  // Paginated Loading Manifests
  const totalLoadingPages = Math.ceil(filteredLoadings.length / PAGE_SIZE) || 1;
  const paginatedLoadings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLoadings.slice(start, start + PAGE_SIZE);
  }, [filteredLoadings, currentPage]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const q = searchTerm.toLowerCase().trim();
      const saleIdStr = `s-${sale.id.toString().padStart(6, "0")}`;
      const matchesSearch =
        !q ||
        sale.id.toString().includes(q) ||
        saleIdStr.includes(q) ||
        (sale.user?.name && sale.user.name.toLowerCase().includes(q));

      const saleDate = sale.date_time ? new Date(sale.date_time) : null;
      const saleYear = saleDate ? saleDate.getFullYear().toString() : "";
      const saleMonth = saleDate
        ? String(saleDate.getMonth() + 1).padStart(2, "0")
        : "";

      const matchesYear = selectedYear === "all" || saleYear === selectedYear;
      const matchesMonth = selectedMonth === "all" || saleMonth === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [sales, searchTerm, selectedYear, selectedMonth]);

  // Paginated Sales
  const totalSalesPages = Math.ceil(filteredSales.length / PAGE_SIZE) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);

  // Invoice Details View
  const handleInvoiceClick = async (id: number) => {
    try {
      setModalLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${id}`
      );
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      alert("Failed to load invoice details.");
    } finally {
      setModalLoading(false);
    }
  };

  // Print Single Supply Invoice
  const handlePrintSupplyInvoice = async (inv: SupplierInvoice) => {
    try {
      let fullInvoice = inv;
      if (!inv.batch_stocks || inv.batch_stocks.length === 0) {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${inv.id}`
        );
        fullInvoice = res.data;
      }
      setPrintableInvoice(fullInvoice);
      setPrintMode("supply-invoice");
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error("Error preparing invoice print:", err);
      alert("Failed to prepare invoice for printing.");
    } finally {
      setLoading(false);
    }
  };

  // Print Monthly / Yearly Invoices Statement
  const handlePrintInvoicesReport = () => {
    if (filteredInvoices.length === 0) {
      alert("No invoices match the selected filters to print.");
      return;
    }
    setPrintMode("supply-report");
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Print Load Manifest
  const handlePrintLoading = (load: any) => {
    setSelectedLoading(load);
    setPrintMode("load-list");
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Status Change Handlers for Loading Manifests
  const handleUpdateStatus = (id: number, newStatus: string) => {
    if (newStatus === "pending") {
      performStatusUpdate(id, newStatus);
      return;
    }
    setStatusConfirmation({ id, status: newStatus });
  };

  const performStatusUpdate = async (id: number, newStatus: string) => {
    try {
      setLoading(true);
      await axios.patch(`${import.meta.env.VITE_API_BASE_URL}/loadings/${id}`, {
        status: newStatus,
      });
      setLoadings(
        loadings.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
      setStatusConfirmation(null);
      refreshTotalValue();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  // Return Processing
  const handleReturnClick = (loadingItem: any) => {
    setReturnLoadingId(loadingItem.id);
    setReturnItems(loadingItem.loading_items || []);
    setReturnQuantities({});
    setReturnModalOpen(true);
  };

  const submitReturns = async () => {
    if (!returnLoadingId) return;

    setSubmittingReturn(true);
    try {
      for (const batchIdStr in returnQuantities) {
        const qtyStr = returnQuantities[batchIdStr];
        const qty = parseInt(qtyStr, 10);
        const batchId = parseInt(batchIdStr, 10);

        if (!isNaN(qty) && qty > 0) {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/loadings/${returnLoadingId}/returns`,
            {
              batch_id: batchId,
              qty: qty,
              return_date: new Date().toISOString().split("T")[0],
              reason: "Returned from loading",
            }
          );
        }
      }

      alert("Returns processed successfully.");
      setReturnModalOpen(false);
      setReturnLoadingId(null);
      setReturnItems([]);
      setReturnQuantities({});
      fetchInvoices();
    } catch (err: any) {
      console.error("Error processing returns:", err);
      alert(err.response?.data?.message || "Failed to process returns.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Pagination Renderer Component
  const renderPagination = (
    currPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalItems <= PAGE_SIZE) return null;

    const startIdx = (currPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(currPage * PAGE_SIZE, totalItems);

    return (
      <div className="bg-white px-4 py-3 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <p className="text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-900">{startIdx}</span> to{" "}
          <span className="font-semibold text-slate-900">{endIdx}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span> records
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(currPage - 1)}
            disabled={currPage === 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-xs"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <span className="px-2.5 py-1 text-slate-600 font-semibold font-mono">
            Page {currPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currPage + 1)}
            disabled={currPage === totalPages}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-xs"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const isFilterActive =
    searchTerm.trim() !== "" || selectedMonth !== "all" || selectedYear !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedMonth("all");
    setSelectedYear("all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fa] text-slate-900 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Invoices & Manifests
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review supplier stock receipts, outbound loading manifests, and POS sales logs
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Total Warehouse Valuation Badge */}
            <div className="bg-white border border-stone-200 rounded-xl px-3.5 py-2 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                <Layers size={16} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Warehouse Stock Value
                </p>
                <p className="text-xs font-bold text-teal-950 font-mono mt-1 leading-none">
                  {formatCurrency(Number(totalValue))}
                </p>
              </div>
            </div>

            {/* Quick action button based on tab */}
            {activeTab === "supply" && (
              <button
                type="button"
                onClick={() => navigate("/new-supply")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus size={14} />
                <span>New Supply</span>
              </button>
            )}
            {activeTab === "loading" && (
              <button
                type="button"
                onClick={() => navigate("/loading")}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus size={14} />
                <span>New Loading</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: "supply", label: "Supply Invoices", icon: <FileText size={14} />, count: invoices.length },
            { id: "loading", label: "Loading Manifests", icon: <Truck size={14} />, count: loadings.length },
            { id: "sales", label: "Sales Invoices", icon: <ShoppingCart size={14} />, count: sales.length },
            { id: "shop", label: "Shop Invoices", icon: <Store size={14} />, count: null },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shadow-xs ${
                  isActive
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:text-slate-900 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-stone-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar: Search, Filters by Month & Year, Print Statement */}
        {activeTab !== "shop" && (
          <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "supply"
                    ? "Search invoice # or supplier..."
                    : activeTab === "loading"
                    ? "Search load ref, truck, route, or rep..."
                    : "Search sale ID or cashier..."
                }
                className="w-full h-9 pl-9 pr-8 text-xs text-slate-900 bg-white border border-stone-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Controls: Month, Year & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Month Selector */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 px-2.5 pr-7 text-xs font-medium text-slate-700 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 appearance-none transition-colors"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Calendar
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              {/* Year Selector */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-9 px-2.5 pr-7 text-xs font-medium text-slate-700 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 appearance-none transition-colors"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <Filter
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              {/* Clear Filters Button */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-2.5 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}

              {/* Print Filtered Report Button */}
              {activeTab === "supply" && (
                <button
                  type="button"
                  onClick={handlePrintInvoicesReport}
                  disabled={filteredInvoices.length === 0}
                  className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Print filtered invoices list"
                >
                  <Printer size={14} className="text-slate-500" />
                  <span>Print Report</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: SUPPLY INVOICES */}
        {activeTab === "supply" && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-4 py-2.5 w-10 text-center">#</th>
                    <th className="px-4 py-2.5">Invoice No</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5 text-right">Declared Bill Total</th>
                    <th className="px-4 py-2.5 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={26} className="animate-spin text-teal-800" />
                          <p className="text-xs font-semibold text-slate-700">
                            Loading supply invoices...
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Fetching data from warehouse database
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center">
                        <FileText size={30} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No supply invoices found
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isFilterActive
                            ? "Try adjusting your search query, month, or year filters"
                            : "New supply shipments will appear here once recorded"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((inv, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => handleInvoiceClick(inv.id)}
                          className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>
                          <td className="px-4 py-2.5 font-bold font-mono text-teal-900">
                            #{inv.invoice_number}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium">
                            {inv.invoice_date}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {inv.supplier?.name || `Supplier #${inv.supplier_id}`}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(inv.total_bill_amount))}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintSupplyInvoice(inv);
                                }}
                                title="Print Invoice"
                                className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvoiceClick(inv.id);
                                }}
                                title="View Details"
                                className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Supply Invoices */}
            {!loading &&
              renderPagination(
                currentPage,
                totalSupplyPages,
                filteredInvoices.length,
                setCurrentPage
              )}
          </div>
        )}

        {/* TAB 2: LOADING MANIFESTS */}
        {activeTab === "loading" && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-4 py-2.5 w-10 text-center">#</th>
                    <th className="px-4 py-2.5">Load Ref</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Vehicle & Crew</th>
                    <th className="px-4 py-2.5">Territory / Route</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-right w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={26} className="animate-spin text-teal-800" />
                          <p className="text-xs font-semibold text-slate-700">
                            Loading manifests...
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Fetching dispatch manifests
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : loadingError ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-rose-600 font-semibold">
                        {loadingError}
                      </td>
                    </tr>
                  ) : paginatedLoadings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <Truck size={30} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No loading manifests found
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isFilterActive
                            ? "Try adjusting your search query, month, or year filters"
                            : "New outbound manifests will appear here"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLoadings.map((load, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr
                          key={load.id}
                          className="hover:bg-stone-50/70 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>
                          <td className="px-4 py-2.5 font-bold font-mono text-teal-900">
                            {load.load_number}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium">
                            {load.loading_date}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-900">
                              {load.truck?.licence_plate_no || "No Vehicle"}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">
                              Rep: {load.sales_rep?.name || "-"} | Dr: {load.driver?.name?.split(" ")[0] || "-"}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-slate-800">
                              {load.route?.route_code || "-"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">
                              {load.route?.route_description}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <select
                              value={load.status}
                              onChange={(e) =>
                                handleUpdateStatus(load.id, e.target.value)
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border ${
                                load.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : load.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="delivered">Delivered</option>
                              <option value="not_delivered">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleReturnClick(load)}
                                title="Process Returns"
                                className="p-1 text-slate-500 hover:text-amber-700 hover:bg-stone-100 rounded transition-colors"
                              >
                                <RefreshCw size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintLoading(load)}
                                title="Print Load Manifest"
                                className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedLoading(load)}
                                title="View Details"
                                className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Loading Manifests */}
            {!loading &&
              renderPagination(
                currentPage,
                totalLoadingPages,
                filteredLoadings.length,
                setCurrentPage
              )}
          </div>
        )}

        {/* TAB 3: SALES INVOICES */}
        {activeTab === "sales" && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="px-4 py-2.5 w-10 text-center">#</th>
                    <th className="px-4 py-2.5">Invoice #</th>
                    <th className="px-4 py-2.5">Date & Time</th>
                    <th className="px-4 py-2.5">Cashier</th>
                    <th className="px-4 py-2.5 text-center">Payment Type</th>
                    <th className="px-4 py-2.5 text-right">Total Amount</th>
                    <th className="px-4 py-2.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={26} className="animate-spin text-teal-800" />
                          <p className="text-xs font-semibold text-slate-700">
                            Loading sales transactions...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <ShoppingCart size={30} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No sales invoices found
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isFilterActive
                            ? "Try adjusting your search query, month, or year filters"
                            : "Completed POS counter sales will appear here"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr
                          key={sale.id}
                          className="hover:bg-stone-50/70 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {rowNum}
                          </td>
                          <td className="px-4 py-2.5 font-bold font-mono text-teal-900">
                            S-{sale.id.toString().padStart(6, "0")}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 font-medium">
                            {new Date(sale.date_time).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {sale.user?.name || "Cashier"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                sale.payment_type === "cash"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-teal-50 text-teal-800 border border-teal-200"
                              }`}
                            >
                              {sale.payment_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(Number(sale.total))}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSale(sale)}
                              title="View Sale Details"
                              className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Sales */}
            {!loading &&
              renderPagination(
                currentPage,
                totalSalesPages,
                filteredSales.length,
                setCurrentPage
              )}
          </div>
        )}

        {/* TAB 4: SHOP INVOICES */}
        {activeTab === "shop" && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 text-slate-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Store size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Shop Invoices Module
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Direct shop store invoices and retail billing module is currently in progress
            </p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL: SUPPLY INVOICE */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Supply Invoice Details
                </p>
                <h3 className="text-xs font-bold text-slate-900 font-mono">
                  #{selectedInvoice.invoice_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {modalLoading ? (
                <div className="py-16 text-center">
                  <Loader2 size={24} className="animate-spin text-teal-800 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Loading invoice details...</p>
                </div>
              ) : (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-4 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Supplier
                      </p>
                      <p className="font-bold text-slate-900 truncate">
                        {selectedInvoice.supplier?.name || `Supplier #${selectedInvoice.supplier_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Invoice Date
                      </p>
                      <p className="font-bold text-slate-900">
                        {selectedInvoice.invoice_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Declared Total
                      </p>
                      <p className="font-bold text-teal-900 font-mono text-sm">
                        {formatCurrency(Number(selectedInvoice.total_bill_amount))}
                      </p>
                    </div>
                  </div>

                  {/* Stocked Items Table */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                          <th className="px-3.5 py-2">Product & Code</th>
                          <th className="px-3 py-2 text-center">Breakdown</th>
                          <th className="px-3 py-2 text-center">Free Units</th>
                          <th className="px-3 py-2 text-right">Net Cost</th>
                          <th className="px-3 py-2 text-right">Retail</th>
                          <th className="px-3.5 py-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedInvoice.batch_stocks?.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/60">
                            <td className="px-3.5 py-2">
                              <p className="font-semibold text-slate-900">
                                {item.product.name}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {item.product.barcode || item.product.material_code}
                                {item.expiry_date && ` | Exp: ${item.expiry_date}`}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                              {item.no_cases} × {item.pack_size}
                              {item.extra_units > 0 && ` + ${item.extra_units}`}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {item.free_qty > 0 ? (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                  +{item.free_qty}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-800">
                              {formatCurrency(Number(item.netprice))}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              {formatCurrency(Number(item.retail_price))}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(
                                (Number(item.no_cases) * Number(item.pack_size) +
                                  Number(item.extra_units || 0)) *
                                  Number(item.netprice)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handlePrintSupplyInvoice(selectedInvoice)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: LOADING MANIFEST */}
      {selectedLoading && printMode !== "load-list" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Loading Manifest Details
                </p>
                <h3 className="text-xs font-bold text-slate-900 font-mono">
                  {selectedLoading.load_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLoading(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Vehicle
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedLoading.truck?.licence_plate_no || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Route
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedLoading.route?.route_code || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Sales Rep
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedLoading.sales_rep?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Date
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedLoading.loading_date}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                      <th className="px-3.5 py-2">Product</th>
                      <th className="px-3 py-2 text-center">Unit Breakdown</th>
                      <th className="px-3 py-2 text-center">Free Qty</th>
                      <th className="px-3 py-2 text-right">Net Price</th>
                      <th className="px-3 py-2 text-right">Retail</th>
                      <th className="px-3.5 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedLoading.loading_items?.map((item: any) => {
                      const netPrice = Number(item.net_price || 0);
                      const retailPrice = Number(item.batch_stock?.retail_price || 0);
                      const paidUnits = Number(item.qty) - Number(item.free_qty || 0);
                      return (
                        <tr key={item.id} className="hover:bg-stone-50/60">
                          <td className="px-3.5 py-2">
                            <p className="font-semibold text-slate-900">
                              {item.batch_stock?.product?.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.batch_stock?.product?.material_code}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">
                            {item.qty} units
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.free_qty > 0 ? (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                +{item.free_qty}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-800">
                            {formatCurrency(netPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-500">
                            {formatCurrency(retailPrice)}
                          </td>
                          <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(paidUnits * netPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handlePrintLoading(selectedLoading)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Printer size={14} />
                <span>Print Manifest</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLoading(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: SALES INVOICE */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Sales Transaction Details
                </p>
                <h3 className="text-xs font-bold text-slate-900 font-mono">
                  S-{selectedSale.id.toString().padStart(6, "0")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Date & Time
                  </p>
                  <p className="font-bold text-slate-900">
                    {new Date(selectedSale.date_time).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(selectedSale.date_time).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Cashier
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedSale.user?.name || "Cashier"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Payment Method
                  </p>
                  <p className="font-bold text-slate-900 capitalize">
                    {selectedSale.payment_type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Grand Total
                  </p>
                  <p className="font-bold text-teal-900 font-mono text-sm">
                    {formatCurrency(Number(selectedSale.total))}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                      <th className="px-3.5 py-2">Product Name</th>
                      <th className="px-3 py-2 text-center">Qty (Units)</th>
                      <th className="px-3 py-2 text-right">Retail Price</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3.5 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedSale.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-stone-50/60">
                        <td className="px-3.5 py-2 font-medium text-slate-900">
                          {item.product?.name}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">
                          {item.qty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">
                          {formatCurrency(
                            Number(
                              item.retail_price ||
                                item.batch_stock?.retail_price ||
                                item.unit_price
                            )
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-rose-600">
                          - {formatCurrency(Number(item.discount || 0))}
                        </td>
                        <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(Number(item.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURNS MODAL */}
      {returnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Process Loading Returns
                </p>
                <h3 className="text-xs font-bold text-slate-900">
                  Load #
                  {loadings.find((l) => l.id === returnLoadingId)?.load_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {returnItems.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  No items found in this loading manifest.
                </p>
              ) : (
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                        <th className="px-3.5 py-2">Product</th>
                        <th className="px-3 py-2 text-center">Loaded Qty</th>
                        <th className="px-3 py-2 text-center w-28">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {returnItems.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/60">
                          <td className="px-3.5 py-2">
                            <p className="font-semibold text-slate-900">
                              {item.batch_stock?.product?.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {item.batch_stock?.product?.material_code}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={item.qty}
                              className="w-full h-7 px-2 border border-stone-300 rounded text-center font-bold text-xs outline-none focus:border-teal-700"
                              placeholder="0"
                              value={returnQuantities[item.batch_stock?.id] || ""}
                              onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 0) val = 0;
                                if (val > item.qty) val = item.qty;

                                setReturnQuantities({
                                  ...returnQuantities,
                                  [item.batch_stock?.id]: val.toString(),
                                });
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-slate-400 italic">
                Returned quantities will be restored back to warehouse batch stock.
              </p>
            </div>

            <div className="px-5 py-3 bg-stone-50/70 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                disabled={submittingReturn}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReturns}
                disabled={submittingReturn}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {submittingReturn ? "Processing..." : "Confirm Returns"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CHANGE CONFIRMATION MODAL */}
      {statusConfirmation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Update Status?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mark this manifest status as{" "}
              <strong className="text-slate-900 uppercase">
                {statusConfirmation.status.replace("_", " ")}
              </strong>
              ? Warehouse stock will be updated accordingly.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusConfirmation(null)}
                className="py-1.5 text-xs font-semibold text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  performStatusUpdate(
                    statusConfirmation.id,
                    statusConfirmation.status
                  )
                }
                className="py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-sm transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE SECTION 1: SINGLE SUPPLY INVOICE GOODS RECEIVED VOUCHER */}
      {/* ========================================================================= */}
      {printMode === "supply-invoice" && printableInvoice && (
        <div
          id="printable-supply-invoice"
          className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-mono text-black text-xs"
        >
          <div className="border-b-2 border-black pb-4 mb-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wider">
              THEJANI TRADERS - CHILAW
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest mt-0.5">
              SUPPLY INVOICE & GOODS RECEIVED NOTE
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-bold">
            <div>
              <p>
                <span className="w-28 inline-block">Invoice No</span>: #{printableInvoice.invoice_number}
              </p>
              <p>
                <span className="w-28 inline-block">Supplier</span>: {printableInvoice.supplier?.name || `Supplier #${printableInvoice.supplier_id}`}
              </p>
              <p>
                <span className="w-28 inline-block">Invoice Date</span>: {printableInvoice.invoice_date}
              </p>
            </div>
            <div className="text-right">
              <p>
                <span className="w-28 inline-block">Print Date</span>: {new Date().toLocaleDateString()}
              </p>
              <p>
                <span className="w-28 inline-block">Print Time</span>: {new Date().toLocaleTimeString()}
              </p>
              <p>
                <span className="w-28 inline-block">Declared Total</span>: Rs. {Number(printableInvoice.total_bill_amount).toFixed(2)}
              </p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="border-y-2 border-black font-black">
                <th className="py-1.5 text-left">Product Code & Description</th>
                <th className="py-1.5 text-center">Cases</th>
                <th className="py-1.5 text-center">Pack</th>
                <th className="py-1.5 text-center">Extra</th>
                <th className="py-1.5 text-center">Free Qty</th>
                <th className="py-1.5 text-center">Total Units</th>
                <th className="py-1.5 text-right">Net Cost</th>
                <th className="py-1.5 text-right">Retail</th>
                <th className="py-1.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {printableInvoice.batch_stocks?.map((b) => {
                const totalUnits =
                  Number(b.no_cases) * Number(b.pack_size) +
                  Number(b.extra_units || 0) +
                  Number(b.free_qty || 0);
                const paidUnits = totalUnits - Number(b.free_qty || 0);
                const lineTotal = paidUnits * Number(b.netprice);

                return (
                  <tr key={b.id} className="border-b border-black">
                    <td className="py-1.5">
                      <p className="font-bold">{b.product?.name}</p>
                      <p className="text-[10px]">{b.product?.barcode || b.product?.material_code}</p>
                    </td>
                    <td className="py-1.5 text-center font-bold">{b.no_cases}</td>
                    <td className="py-1.5 text-center">{b.pack_size}</td>
                    <td className="py-1.5 text-center">{b.extra_units || "-"}</td>
                    <td className="py-1.5 text-center font-bold">{b.free_qty || "-"}</td>
                    <td className="py-1.5 text-center font-bold">{totalUnits}</td>
                    <td className="py-1.5 text-right">{Number(b.netprice).toFixed(2)}</td>
                    <td className="py-1.5 text-right">{Number(b.retail_price).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-bold">{lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black">
                <td colSpan={8} className="py-2 text-right uppercase">
                  Stocked Items Total (Rs.):
                </td>
                <td className="py-2 text-right">
                  {printableInvoice.batch_stocks
                    ?.reduce((sum, b) => {
                      const paidUnits =
                        Number(b.no_cases) * Number(b.pack_size) +
                        Number(b.extra_units || 0);
                      return sum + paidUnits * Number(b.netprice);
                    }, 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-14 flex justify-between text-xs font-bold">
            <p>Received By: _________________</p>
            <p>Checked By: _________________</p>
            <p>Authorized By: _________________</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE SECTION 2: SUPPLY INVOICES STATEMENT (FILTERED MONTH/YEAR) */}
      {/* ========================================================================= */}
      {printMode === "supply-report" && (
        <div
          id="printable-invoices-report"
          className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-mono text-black text-xs"
        >
          <div className="border-b-2 border-black pb-4 mb-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wider">
              THEJANI TRADERS - CHILAW
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest mt-0.5">
              SUPPLY INVOICES STATEMENT
            </p>
            <p className="text-[11px] mt-1 font-bold">
              Period: {selectedMonth !== "all" ? MONTHS.find((m) => m.value === selectedMonth)?.label : "All Months"} {selectedYear !== "all" ? selectedYear : "All Years"}
              {searchTerm && ` | Filter: "${searchTerm}"`}
            </p>
          </div>

          <div className="flex justify-between text-xs font-bold mb-3">
            <p>Total Invoices: {filteredInvoices.length}</p>
            <p>Report Date: {new Date().toLocaleDateString()}</p>
          </div>

          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="border-y-2 border-black font-black">
                <th className="py-1.5 text-center w-10">#</th>
                <th className="py-1.5 text-left">Invoice No</th>
                <th className="py-1.5 text-center">Date</th>
                <th className="py-1.5 text-left">Supplier</th>
                <th className="py-1.5 text-right">Bill Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv, idx) => (
                <tr key={inv.id} className="border-b border-black">
                  <td className="py-1.5 text-center">{idx + 1}</td>
                  <td className="py-1.5 font-bold font-mono">#{inv.invoice_number}</td>
                  <td className="py-1.5 text-center">{inv.invoice_date}</td>
                  <td className="py-1.5 font-semibold">
                    {inv.supplier?.name || `Supplier #${inv.supplier_id}`}
                  </td>
                  <td className="py-1.5 text-right font-bold font-mono">
                    {Number(inv.total_bill_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black">
                <td colSpan={4} className="py-2 text-right uppercase">
                  Grand Total Statement Value:
                </td>
                <td className="py-2 text-right font-mono">
                  Rs.{" "}
                  {filteredInvoices
                    .reduce((sum, inv) => sum + Number(inv.total_bill_amount || 0), 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-14 flex justify-between text-xs font-bold">
            <p>Generated By: ADMIN</p>
            <p>Verified By: _________________</p>
            <p>Signature: _________________</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE SECTION 3: OUTBOUND LOAD LIST */}
      {/* ========================================================================= */}
      {printMode === "load-list" && selectedLoading && (
        <div
          id="printable-loadlist"
          className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-mono text-black text-xs overflow-y-auto"
        >
          <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
            <div className="w-48"></div>
            <div className="text-center flex-1">
              <h1 className="text-xl font-black uppercase tracking-wider">
                THEJANI TRADERS - CHILAW
              </h1>
              <h2 className="text-sm font-bold uppercase mt-1">Load List Manifest</h2>
            </div>
            <div className="w-48 text-right">
              <p className="text-[11px] font-bold">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-[11px] font-bold">Task: {selectedLoading.load_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 text-xs font-bold">
            <div>
              <p>Load Number: {selectedLoading.load_number}</p>
              <p>Vehicle: {selectedLoading.truck?.licence_plate_no}</p>
              <p>Territory: {selectedLoading.route?.route_code || "CHL1"}</p>
            </div>
            <div>
              <p>Executive: {selectedLoading.sales_rep?.name || "-"}</p>
              <p>Delivery Date: {selectedLoading.loading_date}</p>
              <p>Route: {selectedLoading.route?.route_description}</p>
            </div>
            <div>
              <p>Driver: {selectedLoading.driver?.name || "-"}</p>
              <p>Helper: {selectedLoading.helper?.name || "-"}</p>
              <p>Cashier: {selectedLoading.cash_collector?.name || "-"}</p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mb-6">
            <thead>
              <tr className="border-y-2 border-black font-black">
                <th className="py-1.5 text-left w-1/3">Product Code & Description</th>
                <th className="py-1.5 text-center">Cases</th>
                <th className="py-1.5 text-center">Units</th>
                <th className="py-1.5 text-right">Net Price</th>
                <th className="py-1.5 text-right">Retail</th>
                <th className="py-1.5 text-center">Free Qty</th>
                <th className="py-1.5 text-right">Total Units</th>
                <th className="py-1.5 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groups: Record<string, any[]> = {};
                selectedLoading.loading_items?.forEach((item: any) => {
                  const code = item.batch_stock?.product?.material_code || "";
                  const brandKey = code.substring(0, 2).toUpperCase();
                  const brandName = brandMapping[brandKey] || "OTHER";
                  if (!groups[brandName]) groups[brandName] = [];
                  groups[brandName].push(item);
                });

                return Object.entries(groups).map(([brand, items]) => (
                  <React.Fragment key={brand}>
                    {brand !== "OTHER" && (
                      <tr className="border-b border-black">
                        <td colSpan={8} className="py-1 font-black uppercase text-xs">
                          {brand}
                        </td>
                      </tr>
                    )}
                    {items.map((item: any) => {
                      const packSize = item.batch_stock?.pack_size || 1;
                      const mainQty = item.qty - (item.free_qty || 0);
                      const cases = Math.floor(mainQty / packSize);
                      const units = mainQty % packSize;
                      const netPrice = Number(item.net_price || 0);
                      const retailPrice = Number(item.batch_stock?.retail_price || 0);
                      const lineTotal = mainQty * netPrice;

                      return (
                        <tr key={item.id} className="border-b border-black">
                          <td className="py-1">
                            <p className="font-bold">{item.batch_stock?.product?.name}</p>
                            <p className="text-[10px]">{item.batch_stock?.product?.material_code}</p>
                          </td>
                          <td className="py-1 text-center">{cases > 0 ? cases : "-"}</td>
                          <td className="py-1 text-center">{units > 0 ? units : "-"}</td>
                          <td className="py-1 text-right">{netPrice.toFixed(2)}</td>
                          <td className="py-1 text-right">{retailPrice.toFixed(2)}</td>
                          <td className="py-1 text-center">{item.free_qty > 0 ? item.free_qty : "-"}</td>
                          <td className="py-1 text-right font-bold">{item.qty}</td>
                          <td className="py-1 text-right font-bold">{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black">
                <td colSpan={7} className="py-2 text-right uppercase">
                  Total Manifest Value:
                </td>
                <td className="py-2 text-right">
                  Rs.{" "}
                  {selectedLoading.loading_items
                    ?.reduce((sum: number, item: any) => {
                      const mainQty = item.qty - (item.free_qty || 0);
                      return sum + mainQty * Number(item.net_price || 0);
                    }, 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-14 flex justify-between text-xs font-bold">
            <p>Prepared By: _________________</p>
            <p>Authorized By: _________________</p>
            <p>Received By: _________________</p>
          </div>
        </div>
      )}

      {/* Global Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-supply-invoice, #printable-supply-invoice * {
            visibility: visible !important;
          }
          #printable-invoices-report, #printable-invoices-report * {
            visibility: visible !important;
          }
          #printable-loadlist, #printable-loadlist * {
            visibility: visible !important;
          }
          #printable-supply-invoice,
          #printable-invoices-report,
          #printable-loadlist {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: white !important;
          }
          @page {
            margin: 0;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  );
};

export default SupplyInvoices;
