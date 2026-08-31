import React, { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import EmployeeSelect from "../components/EmployeeSelect";
import {
  Truck,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Hash,
  MapPin,
  User,
  Users,
  Check,
  RotateCcw,
  Boxes,
  ShieldAlert,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  category?: string;
}

interface TruckType {
  id: number;
  licence_plate_no: string;
  description: string;
}

interface RouteType {
  id: number;
  route_code: string;
  route_description: string;
}

interface EmployeeType {
  id: number;
  name: string;
  nic: string;
  phoneno: string;
}

interface SalesRepType {
  id: number;
  name: string;
  rep_id: string;
  route_id: number;
}

interface BatchStock {
  id: number;
  remain_qty: number;
  returned_qty?: number;
  free_qty: number;
  no_cases: number;
  pack_size: number;
  extra_units: number;
  expiry_date: string;
  retail_price?: number;
  netprice?: number;
  product?: Product;
  supplier_invoice_id: number;
  supplier_invoice?: {
    invoice_number: string;
    invoice_date: string;
  };
  created_at?: string;
}

interface LoadingItem {
  id: number;
  loading_id?: number;
  batch_id: number;
  qty: number;
  free_qty: number;
  wh_price?: number;
  net_price?: number;
  batch_stock?: BatchStock;
  loading?: any;
}

const formatCurrency = (amount: number): string => {
  const safe = isNaN(amount) ? 0 : amount;
  return `LKR ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Loading: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTotalValue } = useWarehouse();

  // Navigation & UI State
  const [step, setStep] = useState<"details" | "items">("details");
  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Data Source State
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepType[]>([]);

  // Loading Header State
  const [loadingData, setLoadingData] = useState({
    id: null as number | null,
    load_number: "",
    truck_id: "",
    route_id: "",
    loading_date: new Date().toISOString().split("T")[0],
    status: "pending",
    driver_id: "",
    helper_id: "",
    cash_collector_id: "",
    sales_rep_id: "",
  });

  // Items State
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [allBatches, setAllBatches] = useState<BatchStock[]>([]);
  const [searchResults, setSearchResults] = useState<BatchStock[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal / Item Entry State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<BatchStock[]>([]);
  const [itemForm, setItemForm] = useState({
    batch_id: "",
    no_cases: "",
    loose_qty: "0",
    free_qty: "0",
    wh_price: "",
    net_price: "",
  });

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Auto-focus search input
  useEffect(() => {
    if (
      step === "items" &&
      !activeProduct &&
      !showConfirmSave &&
      !showConfirmCancel
    ) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, activeProduct, showConfirmSave, showConfirmCancel]);

  // Fetch Initial Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [trucksRes, routesRes, batchesRes, employeesRes, salesRepsRes] =
          await Promise.all([
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/trucks`),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/routes`),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks`),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/employees`),
            axios.get(`${import.meta.env.VITE_API_BASE_URL}/sales-reps`),
          ]);
        setTrucks(trucksRes.data);
        setRoutes(routesRes.data);
        setAllBatches(batchesRes.data);
        setEmployees(employeesRes.data);
        setSalesReps(salesRepsRes.data);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const query = searchTerm.toLowerCase();
    const filtered = allBatches.filter((b) => {
      const p = b.product;
      if (!p || b.remain_qty <= 0) return false;

      return (
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.material_code.toLowerCase().includes(query)
      );
    });

    setSearchResults(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, allBatches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelectBatch(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectBatch(searchResults[0]);
      }
    } else if (e.key === "Escape") {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const handleSelectBatch = (batch: BatchStock) => {
    if (!batch.product) return;

    setProductBatches([batch]);
    setActiveProduct(batch.product);
    setSearchTerm("");
    setSearchResults([]);
    setItemForm({
      batch_id: batch.id.toString(),
      no_cases: "",
      loose_qty: "0",
      free_qty: "0",
      wh_price: "",
      net_price: batch.netprice?.toString() || "",
    });
  };

  const handleRouteChange = (routeId: string) => {
    const selectedRep = salesReps.find(
      (r) => r.route_id.toString() === routeId
    );
    setLoadingData({
      ...loadingData,
      route_id: routeId,
      sales_rep_id: selectedRep
        ? selectedRep.id.toString()
        : loadingData.sales_rep_id,
    });
  };

  const handleCreateLoading = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if at least one employee is selected (Driver, Helper, or Cash Collector)
    if (
      !loadingData.driver_id &&
      !loadingData.helper_id &&
      !loadingData.cash_collector_id
    ) {
      alert(
        "Please select at least one crew member (Driver, Helper, or Cash Collector)."
      );
      return;
    }

    setStep("items");
  };

  // Calculations for modal
  const selectedBatch = productBatches.find(
    (b) => b.id.toString() === itemForm.batch_id
  );
  const currentPackSize = selectedBatch?.pack_size || 1;
  const currentRequestedPaid =
    Number(itemForm.no_cases || 0) * currentPackSize +
    Number(itemForm.loose_qty || 0);
  const currentRequestedFree = Number(itemForm.free_qty || 0);
  const currentTotalRequested = currentRequestedPaid + currentRequestedFree;
  const currentBatchRemaining = selectedBatch?.remain_qty || 0;
  const isStockInsufficient = currentTotalRequested > currentBatchRemaining;
  const currentLinePrice = Number(selectedBatch?.netprice || 0);
  const currentLineValue = currentRequestedPaid * currentLinePrice;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (currentTotalRequested <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (isStockInsufficient) {
      alert(
        `Insufficient stock! Total available in warehouse is ${currentBatchRemaining} units, but ${currentTotalRequested} units were requested.`
      );
      return;
    }

    const newItem: LoadingItem = {
      id: editingItemId || Date.now(),
      batch_id: selectedBatch.id,
      qty: currentTotalRequested,
      free_qty: currentRequestedFree,
      wh_price: 0,
      net_price: currentLinePrice,
      batch_stock: selectedBatch,
    };

    if (editingItemId) {
      setLoadingItems(
        loadingItems.map((item) =>
          item.id === editingItemId ? newItem : item
        )
      );
      setEditingItemId(null);
    } else {
      setLoadingItems([...loadingItems, newItem]);
    }
    setActiveProduct(null);
  };

  const handleEditItem = (item: LoadingItem) => {
    if (!item.batch_stock || !item.batch_stock.product) return;

    setEditingItemId(item.id);
    setProductBatches([item.batch_stock]);
    setActiveProduct(item.batch_stock.product);

    const paidQty = item.qty - (item.free_qty || 0);
    const packSize = item.batch_stock.pack_size || 1;
    const packs = Math.floor(paidQty / packSize);
    const loose = paidQty % packSize;

    setItemForm({
      batch_id: item.batch_id.toString(),
      no_cases: packs.toString(),
      loose_qty: loose.toString(),
      free_qty: (item.free_qty || 0).toString(),
      wh_price: (item.wh_price || 0).toString(),
      net_price: (item.net_price || 0).toString(),
    });
  };

  const handleRemoveItem = (id: number) => {
    setLoadingItems(loadingItems.filter((item) => item.id !== id));
  };

  const handleComplete = async () => {
    if (loadingItems.length === 0) {
      alert("No items added to loading manifest.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...loadingData,
        prepared_date: loadingData.loading_date,
        items: loadingItems.map((item) => ({
          batch_id: item.batch_id,
          qty: item.qty,
          free_qty: item.free_qty,
          wh_price: item.wh_price || 0,
          net_price: item.net_price,
        })),
        driver_id: loadingData.driver_id || null,
        helper_id: loadingData.helper_id || null,
        cash_collector_id: loadingData.cash_collector_id || null,
        sales_rep_id: loadingData.sales_rep_id || null,
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/loadings`,
        payload
      );
      await refreshTotalValue();
      navigate("/supply-invoices", { state: { activeTab: "loading" } });
    } catch (err: any) {
      console.error("Error saving manifest:", err);
      alert(err.response?.data?.message || "Failed to save loading manifest.");
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const totalPaidUnits = loadingItems.reduce(
    (sum, item) => sum + (item.qty - (item.free_qty || 0)),
    0
  );
  const totalFreeUnits = loadingItems.reduce(
    (sum, item) => sum + (Number(item.free_qty) || 0),
    0
  );
  const totalManifestUnits = loadingItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0
  );
  const totalManifestNetValue = loadingItems.reduce(
    (sum, item) =>
      sum +
      (Number(item.qty) - (Number(item.free_qty) || 0)) *
        (Number(item.net_price) || 0),
    0
  );
  const totalFreeUnitsValue = loadingItems.reduce(
    (sum, item) =>
      sum + (Number(item.free_qty) || 0) * (Number(item.net_price) || 0),
    0
  );

  const selectedRouteObj = routes.find(
    (r) => r.id.toString() === loadingData.route_id
  );
  const selectedTruckObj = trucks.find(
    (t) => t.id.toString() === loadingData.truck_id
  );
  const selectedRepObj = salesReps.find(
    (r) => r.id.toString() === loadingData.sales_rep_id
  );
  const driverObj = employees.find(
    (e) => e.id.toString() === loadingData.driver_id
  );
  const helperObj = employees.find(
    (e) => e.id.toString() === loadingData.helper_id
  );
  const cashierObj = employees.find(
    (e) => e.id.toString() === loadingData.cash_collector_id
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fa] text-slate-900 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                Logistics & Dispatch
              </span>
              <span className="inline-flex items-center gap-1 bg-stone-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-stone-200 uppercase tracking-wide">
                {step === "details" ? "Step 1: Configuration" : "Step 2: Manifest Items"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              New Loading Sheet
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure vehicle dispatch, assign route crew, and allocate warehouse stock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {step === "items" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/40"
                >
                  <ArrowLeft size={14} className="text-slate-500" />
                  <span>Edit Config</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmCancel(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-700/40"
                >
                  <RotateCcw size={14} />
                  <span>Discard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmSave(true)}
                  disabled={loadingItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 transition-colors rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-1"
                >
                  <Check size={14} />
                  <span>Complete Loading</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Step 1: Manifest Details & Personnel Configuration */}
        {step === "details" ? (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Manifest Configuration
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select vehicle, delivery route, sales representative, and dispatch crew
                </p>
              </div>
              <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Step 1 of 2
              </span>
            </div>

            <form onSubmit={handleCreateLoading} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: General Assignment */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-stone-200 pb-1.5 flex items-center gap-1.5">
                    <Truck size={14} className="text-teal-800" />
                    <span>General Assignment</span>
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Load Number
                    </label>
                    <div className="relative">
                      <Hash
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="e.g. LOAD-2024-001"
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                        value={loadingData.load_number}
                        onChange={(e) =>
                          setLoadingData({
                            ...loadingData,
                            load_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Truck / Vehicle
                    </label>
                    <select
                      required
                      className="w-full h-9 px-3 rounded-lg bg-white border border-stone-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors appearance-none"
                      value={loadingData.truck_id}
                      onChange={(e) =>
                        setLoadingData({
                          ...loadingData,
                          truck_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Truck</option>
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.licence_plate_no} - {t.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Route
                    </label>
                    <div className="relative">
                      <MapPin
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <select
                        required
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors appearance-none"
                        value={loadingData.route_id}
                        onChange={(e) => handleRouteChange(e.target.value)}
                      >
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.route_code} - {r.route_description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Responsible Sales Representative
                    </label>
                    <div className="relative">
                      <User
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <select
                        required
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors appearance-none"
                        value={loadingData.sales_rep_id}
                        onChange={(e) =>
                          setLoadingData({
                            ...loadingData,
                            sales_rep_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Sales Rep</option>
                        {salesReps.map((rep) => (
                          <option key={rep.id} value={rep.id}>
                            {rep.name} ({rep.rep_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Loading Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="date"
                        required
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                        value={loadingData.loading_date}
                        onChange={(e) =>
                          setLoadingData({
                            ...loadingData,
                            loading_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Dispatch Crew (1-3 Personnel) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users size={14} className="text-teal-800" />
                      <span>Dispatch Team</span>
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-500 bg-stone-100 px-2 py-0.5 rounded">
                      Select 1-3 personnel
                    </span>
                  </div>

                  {/* Driver Field */}
                  <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Driver
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Primary operator
                      </span>
                    </div>
                    <EmployeeSelect
                      label=""
                      employees={employees}
                      value={loadingData.driver_id}
                      onChange={(id) =>
                        setLoadingData({ ...loadingData, driver_id: id })
                      }
                    />
                  </div>

                  {/* Helper Field */}
                  <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Helper
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Stock assistant
                      </span>
                    </div>
                    <EmployeeSelect
                      label=""
                      employees={employees}
                      value={loadingData.helper_id}
                      onChange={(id) =>
                        setLoadingData({ ...loadingData, helper_id: id })
                      }
                    />
                  </div>

                  {/* Cash Collector Field */}
                  <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Cash Collector
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Finance lead
                      </span>
                    </div>
                    <EmployeeSelect
                      label=""
                      employees={employees}
                      value={loadingData.cash_collector_id}
                      onChange={(id) =>
                        setLoadingData({
                          ...loadingData,
                          cash_collector_id: id,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/supply-invoices", {
                      state: { activeTab: "loading" },
                    })
                  }
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 active:bg-teal-950 transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-1"
                >
                  <span>Initialize Manifest & Add Items</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 2: Manifest Items & Warehouse Stock Allocation */
          <div className="space-y-4">
            {/* Manifest Overview & KPI Strip */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Manifest Meta */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 mt-0.5">
                  <Truck size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Manifest & Vehicle
                  </p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {loadingData.load_number}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedTruckObj?.licence_plate_no || "No Truck"} | {selectedRouteObj?.route_code || "No Route"}
                  </p>
                </div>
              </div>

              {/* Personnel */}
              <div className="flex items-start gap-3 border-t sm:border-t-0 sm:border-l border-stone-200 sm:pl-4 pt-3 sm:pt-0">
                <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  <Users size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Crew
                  </p>
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    Rep: {selectedRepObj?.name || "-"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Dr: {driverObj?.name?.split(" ")[0] || "-"} | Hp: {helperObj?.name?.split(" ")[0] || "-"} | Cs: {cashierObj?.name?.split(" ")[0] || "-"}
                  </p>
                </div>
              </div>

              {/* Items & Units */}
              <div className="border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-4 pt-3 lg:pt-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Loaded Stock
                </p>
                <p className="text-xs font-bold text-slate-900">
                  {loadingItems.length} {loadingItems.length === 1 ? "Product" : "Products"} | {totalManifestUnits} Units
                </p>
                <p className="text-[11px] text-slate-500">
                  Paid: {totalPaidUnits} | Free: {totalFreeUnits} units
                </p>
              </div>

              {/* Manifest Value */}
              <div className="border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-4 pt-3 lg:pt-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Manifest Net Value
                </p>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {formatCurrency(totalManifestNetValue)}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Free Value: {formatCurrency(totalFreeUnitsValue)}
                </p>
              </div>
            </div>

            {/* Stock Search & Scan Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-stone-200 relative">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-white border border-stone-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors"
                  placeholder="Scan barcode or search available warehouse stock by name, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto z-40">
                  {searchResults.map((batch, index) => (
                    <div
                      key={batch.id}
                      onClick={() => handleSelectBatch(batch)}
                      className={`px-3.5 py-2.5 cursor-pointer border-b border-stone-100 last:border-0 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                        selectedIndex === index
                          ? "bg-teal-50 text-teal-900 font-semibold"
                          : "hover:bg-stone-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 w-28 text-center shrink-0">
                          {batch.product?.barcode || batch.product?.material_code}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {batch.product?.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Exp: {batch.expiry_date || "N/A"} | Inv Date: {batch.supplier_invoice?.invoice_date || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right shrink-0">
                        <span className="text-[11px] font-semibold text-slate-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          Avail: {batch.remain_qty} units
                        </span>
                        <span className="text-[11px] font-mono text-teal-800 font-semibold">
                          Net: {formatCurrency(Number(batch.netprice || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manifest Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                      <th className="px-4 py-2.5">Stock Identifier</th>
                      <th className="px-4 py-2.5 text-center">Batch Vol. & Breakdown</th>
                      <th className="px-4 py-2.5 text-center">Free Qty</th>
                      <th className="px-4 py-2.5 text-center">Total Loaded</th>
                      <th className="px-4 py-2.5 text-right">Net Price</th>
                      <th className="px-4 py-2.5 text-right">Retail Price</th>
                      <th className="px-4 py-2.5 text-right">Net Value</th>
                      <th className="px-4 py-2.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loadingItems.map((item, idx) => {
                      const paidQty = item.qty - (item.free_qty || 0);
                      const packSize = item.batch_stock?.pack_size || 1;
                      const cases = Math.floor(paidQty / packSize);
                      const loose = paidQty % packSize;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-stone-50/70 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-900">
                              {item.batch_stock?.product?.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {item.batch_stock?.product?.barcode ||
                                item.batch_stock?.product?.material_code}
                              <span className="mx-1.5 text-stone-300">|</span>
                              Exp: {item.batch_stock?.expiry_date || "N/A"}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-[11px] text-slate-600">
                            {cases} × {packSize}
                            {loose > 0 && (
                              <span className="text-teal-700 font-semibold ml-1">
                                + {loose} loose
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {item.free_qty > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                +{item.free_qty}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                            {item.qty}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                            {formatCurrency(Number(item.net_price || 0))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                            {formatCurrency(
                              Number(item.batch_stock?.retail_price || 0)
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(
                              paidQty * Number(item.net_price || 0)
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                title="Edit item quantity"
                                className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {loadingItems.length === 0 && (
                <div className="py-14 text-center px-4">
                  <Boxes
                    size={32}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  <p className="text-xs font-semibold text-slate-700">
                    No items added to loading manifest yet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    Scan a product barcode or search available warehouse stock above to assign packages
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Item Allocation Modal */}
      {activeProduct && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  {editingItemId ? "Modify Manifest Item" : "Allocate Stock to Manifest"}
                </p>
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {activeProduct.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Code: {activeProduct.barcode || activeProduct.material_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveProduct(null);
                  setEditingItemId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              {/* Batch details strip */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Available Stock
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedBatch.remain_qty} units
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Pack Size
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedBatch.pack_size} / case
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Expiry Date
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedBatch.expiry_date || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Full Cases
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    autoFocus
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={itemForm.no_cases}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, no_cases: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Loose Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={itemForm.loose_qty}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, loose_qty: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                  Free Quantity (Bonus Units)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-8 px-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                  value={itemForm.free_qty}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, free_qty: e.target.value })
                  }
                />
              </div>

              {/* Real-time Calculation & Stock Validation */}
              <div
                className={`p-3 rounded-lg border text-xs ${
                  isStockInsufficient
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : "bg-stone-50 border-stone-200 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between font-medium mb-1">
                  <span>Total Requested:</span>
                  <span className="font-bold font-mono">
                    {currentTotalRequested} units
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Warehouse Stock Remaining:</span>
                  <span
                    className={`font-mono font-semibold ${
                      isStockInsufficient ? "text-rose-700" : "text-slate-700"
                    }`}
                  >
                    {currentBatchRemaining - currentTotalRequested} units
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                  <span className="font-semibold">Calculated Value:</span>
                  <span className="font-bold font-mono text-teal-900">
                    {formatCurrency(currentLineValue)}
                  </span>
                </div>

                {isStockInsufficient && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                    <ShieldAlert size={14} />
                    <span>Requested amount exceeds available batch stock!</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProduct(null);
                    setEditingItemId(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStockInsufficient || loading}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-teal-800 rounded-lg hover:bg-teal-900 active:bg-teal-950 transition-colors shadow-sm disabled:opacity-50"
                >
                  {editingItemId ? "Update Item" : "Add to Manifest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Save Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Finalize Loading Manifest?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Saving will confirm dispatch of {loadingItems.length} product {loadingItems.length === 1 ? "line" : "lines"} totaling{" "}
              <strong>{formatCurrency(totalManifestNetValue)}</strong> for load #{loadingData.load_number}.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="py-1.5 text-xs font-semibold text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 rounded-lg shadow-sm transition-colors"
              >
                {loading ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Discard Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Discard Manifest?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All items added to manifest #{loadingData.load_number} will be discarded.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="py-1.5 text-xs font-semibold text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate("/supply-invoices", {
                    state: { activeTab: "loading" },
                  })
                }
                className="py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loading;
