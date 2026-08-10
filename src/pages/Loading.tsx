import { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import EmployeeSelect from "../components/EmployeeSelect";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  category: string;
}

interface Truck {
  id: number;
  licence_plate_no: string;
  description: string;
}

interface Route {
  id: number;
  route_code: string;
  route_description: string;
}

interface Employee {
  id: number;
  name: string;
  nic: string;
  phoneno: string;
}

interface SalesRep {
  id: number;
  name: string;
  rep_id: string;
  route_id: number;
}

interface BatchStock {
  id: number;
  remain_qty: number; // Available quantity
  returned_qty?: number; // Returned quantity
  free_qty: number; // Free quantity
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
  created_at: string;
}

interface LoadingItem {
  id: number;
  loading_id: number;
  batch_id: number;
  qty: number;
  free_qty: number;
  wh_price?: number;
  net_price?: number;
  batch_stock?: BatchStock;
  loading?: any;
}

const Loading = () => {
  const navigate = useNavigate();
  const { refreshTotalValue } = useWarehouse();

  // Navigation & UI State
  const [step, setStep] = useState<"details" | "items">("details");
  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Data Source State
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);

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

  // Calculate totals for selected batch in modal
  const selectedBatch = productBatches.find(
    (b) => b.id.toString() === itemForm.batch_id,
  );
  const currentPackSize = selectedBatch?.pack_size || 0;
  const currentTotalQty =
    Number(itemForm.no_cases) * currentPackSize +
    Number(itemForm.loose_qty || 0) +
    Number(itemForm.free_qty || 0);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Auto-focus logic
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

    // Filter batches where product name or code matches
    const filtered = allBatches.filter((b) => {
      const p = b.product;
      if (!p) return false;
      // Filter out batches with no stock
      if (b.remain_qty <= 0) return false;

      return (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()) ||
        (p.barcode &&
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    setSearchResults(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, allBatches]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1,
      );
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        handleSelectBatch(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectBatch(searchResults[0]);
      }
    }
  };

  const handleSelectBatch = (batch: BatchStock) => {
    if (!batch.product) return;

    setProductBatches([batch]); // Only one batch selected
    setActiveProduct(batch.product);
    setSearchTerm("");
    setSearchResults([]);
    setItemForm({
      batch_id: batch.id.toString(),
      no_cases: "",
      loose_qty: "0",
      free_qty: "0",
      wh_price: "", // Not used anymore
      net_price: batch.netprice?.toString() || "", // Buying price
    });
  };

  const handleRouteChange = (routeId: string) => {
    const selectedRep = salesReps.find(
      (r) => r.route_id.toString() === routeId,
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

    // Check if at least one employee is selected (1-3 employees)
    if (
      !loadingData.driver_id &&
      !loadingData.helper_id &&
      !loadingData.cash_collector_id
    ) {
      alert(
        "Please select at least one employee (Driver, Helper, or Cash Collector).",
      );
      return;
    }

    setStep("items");
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    // Calculate total paid quantity requested
    const requestedPaidQty =
      Number(itemForm.no_cases) * currentPackSize +
      Number(itemForm.loose_qty || 0);

    const requestedFreeQty = Number(itemForm.free_qty || 0);

    // Total Requested items (Paid + Free)
    const totalRequested = requestedPaidQty + requestedFreeQty;

    if (totalRequested <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    // Validate against total available pool in 'qty'
    if (totalRequested > (selectedBatch.remain_qty || 0)) {
      alert(
        `Insufficient Stock! Total Available: ${selectedBatch.remain_qty}, Requested: ${totalRequested}`,
      );
      return;
    }

    // Use user-provided split: qty will now be the TOTAL physical units
    const confirmQty = requestedPaidQty + requestedFreeQty;
    const confirmFreeQty = requestedFreeQty;

    // Price Logic: Selling Price = Batch Buying Price (netprice)
    // User requested "use the batch buying price as the selling price of that product"
    // So item.net_price should be batch.netprice
    const finalPrice = Number(selectedBatch.netprice || 0);

    const newItem = {
      id: editingItemId || Date.now(),
      batch_id: selectedBatch.id,
      qty: confirmQty,
      free_qty: confirmFreeQty,
      wh_price: 0, // Ignored
      net_price: finalPrice,
      batch_stock: selectedBatch,
    };

    if (editingItemId) {
      setLoadingItems(
        loadingItems.map((item) =>
          item.id === editingItemId ? (newItem as any) : item,
        ),
      );
      setEditingItemId(null);
    } else {
      setLoadingItems([...loadingItems, newItem as any]);
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
          wh_price: item.wh_price,
          net_price: item.net_price,
        })),
        driver_id: loadingData.driver_id || null,
        helper_id: loadingData.helper_id || null,
        cash_collector_id: loadingData.cash_collector_id || null,
        sales_rep_id: loadingData.sales_rep_id || null,
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/loadings`,
        payload,
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

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            New Loading Sheet
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Create loading manifest and assign stock packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {step === "items" && (
            <>
              <button
                onClick={() => setShowConfirmCancel(true)}
                className="px-6 py-3 font-bold text-gray-500 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmSave(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold transition-all hover:bg-gradient-to-r hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl shadow-blue-200 flex items-center gap-2 text-sm active:scale-95"
              >
                Complete Loading
              </button>
            </>
          )}
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm ml-4">
            <div className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest ${step === "details" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400"}`}>
              1. Details
            </div>
            <div className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest ${step === "items" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-400"}`}>
              2. Items
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {step === "details" ? (
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="font-black text-gray-800 uppercase tracking-tighter text-lg leading-tight">
                  Manifest Configuration
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  Initial Setup & Team Assignment
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  Step 1 of 2
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateLoading} className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: General Info */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                      General Assignment
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5 text-xs uppercase tracking-wider">
                        Load Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. LOAD-001"
                        className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                        value={loadingData.load_number}
                        onChange={(e) =>
                          setLoadingData({
                            ...loadingData,
                            load_number: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5 text-xs uppercase tracking-wider">
                        Truck
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
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

                    <div className="md:col-span-2">
                      <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5 text-xs uppercase tracking-wider">
                        Route
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
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

                    <div className="md:col-span-2">
                      <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5 text-xs uppercase tracking-wider">
                        Responsible Sales Rep
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2.5 rounded-lg bg-blue-50/50 border border-blue-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all font-black text-blue-900"
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
                </div>

                {/* Right Side: Dispatch Team */}
                <div className="lg:col-span-7 space-y-6 px-4 lg:lg:sticky lg:top-8 lg:h-fit">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                        Dispatch Team
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
                      Select 1-3 Personnel
                    </span>
                  </div>

                  {/* Driver Card */}
                  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1-1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 text-sm">
                            Driver
                          </h4>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
                            Primary operator
                          </p>
                        </div>
                      </div>
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

                  {/* Helper Card */}
                  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-emerald-200 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 text-sm">
                            Helper
                          </h4>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
                            Stock Assistant
                          </p>
                        </div>
                      </div>
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

                  {/* Cash Collector Card */}
                  <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-amber-200 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 text-sm">
                            Cash Collector
                          </h4>
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">
                            Finance Lead
                          </p>
                        </div>
                      </div>
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

              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end mt-10 -mx-8 -mb-8">
                <button
                  type="submit"
                  className="w-full lg:w-auto px-10 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 group"
                >
                  <span>Initialize Loading Sheet</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left Sidebar: Sticky Manifest Info & Search */}
            <div className="w-full lg:w-[350px] lg:sticky lg:top-8 space-y-6">
              {/* Manifest Summary Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-black text-gray-800 tracking-tighter text-xs uppercase tracking-widest leading-none">
                    Manifest Summary
                  </h3>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">
                        Load ID
                      </p>
                      <p className="font-black text-gray-900 text-xl tracking-tight leading-none">
                        #{loadingData.load_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">
                        Sales Rep
                      </p>
                      <p className="font-black text-blue-600 text-sm">
                        {salesReps.find(
                          (r) => r.id.toString() === loadingData.sales_rep_id,
                        )?.name || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-5 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">
                        Route
                      </p>
                      <p className="font-black text-gray-900 text-sm">
                        {routes.find(
                          (r) => r.id.toString() === loadingData.route_id,
                        )?.route_code || "N/A"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {routes.find(
                          (r) => r.id.toString() === loadingData.route_id,
                        )?.route_description || ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">
                        Truck
                      </p>
                      <p className="font-black text-gray-900 text-sm">
                        {trucks.find(
                          (t) => t.id.toString() === loadingData.truck_id,
                        )?.licence_plate_no || "N/A"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {trucks.find(
                          (t) => t.id.toString() === loadingData.truck_id,
                        )?.description || ""}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                      Field Personnel
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase">
                          Driver
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 truncate">
                          {employees.find(
                            (e) => e.id.toString() === loadingData.driver_id,
                          )?.name || "-"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase">
                          Helper
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 truncate">
                          {employees.find(
                            (e) => e.id.toString() === loadingData.helper_id,
                          )?.name || "-"}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase">
                          Cashier
                        </p>
                        <p className="text-[10px] font-bold text-gray-700 truncate">
                          {employees.find(
                            (e) =>
                              e.id.toString() === loadingData.cash_collector_id,
                          )?.name || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-100">
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                      <div className="mb-4 ml-0.5">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">
                          Free Stock Summary
                        </p>
                      </div>
                      <div className="flex justify-between items-end px-0.5">
                        <div>
                          <p className="text-[8px] font-black text-emerald-500 uppercase mb-1.5 tracking-tighter">
                            Free Quantity
                          </p>
                          <p className="text-xl font-black text-emerald-900 leading-none">
                            {loadingItems.reduce(
                              (sum, item) => sum + (Number(item.free_qty) || 0),
                              0,
                            )}
                            <span className="text-[10px] ml-1 font-bold">
                              Units
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-emerald-500 uppercase mb-1.5 tracking-tighter">
                            Total Value
                          </p>
                          <p className="text-xl font-black text-emerald-900 leading-none font-mono">
                            Rs.{" "}
                            {loadingItems
                              .reduce(
                                (sum, item) =>
                                  sum +
                                  (Number(item.free_qty) || 0) *
                                  (Number(item.net_price) || 0),
                                0,
                              )
                              .toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content: Search & Items Table */}
            <div className="flex-1 w-full pb-10 space-y-6">
              {/* Top Search Bar */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-200 relative ring-1 ring-gray-100">
                <div className="flex items-center justify-between mb-4 ml-1">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-black text-gray-800 uppercase tracking-widest">
                      Quick Item Add (Search Stock)
                    </label>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-100 animate-pulse">
                    Scan or Type
                  </span>
                </div>
                <div className="relative group">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-14 pr-6 py-5 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 outline-none font-black text-lg transition-all shadow-inner placeholder:text-gray-300 placeholder:font-bold"
                    placeholder="Search by Barcode, Material Code or Product Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-3 bg-white border border-gray-200 rounded-[2rem] shadow-2xl overflow-hidden z-[110] max-h-[450px] overflow-y-auto animate-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 mx-2">
                    {searchResults.map((batch, index) => (
                      <div
                        key={batch.id}
                        onClick={() => handleSelectBatch(batch)}
                        className={`px-8 py-5 cursor-pointer border-b last:border-0 transition-all ${selectedIndex === index
                          ? "bg-blue-600 text-white shadow-lg"
                          : "hover:bg-blue-50 text-gray-900"
                          }`}
                      >
                        <div className="flex justify-between items-start font-black text-base">
                          <div>
                            <span className="truncate pr-4 block">
                              {batch.product?.name}
                            </span>
                            <div
                              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mt-0.5 ${selectedIndex === index ? "text-blue-100" : "text-gray-400"}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Exp: {batch.expiry_date || "N/A"}
                              <span className="mx-1.5 opacity-40">|</span>
                              Inv:{" "}
                              {batch.supplier_invoice?.invoice_date || "N/A"}
                            </div>
                          </div>
                          <span
                            className={`text-xs shrink-0 font-mono ${selectedIndex === index ? "text-blue-100" : "text-gray-400"}`}
                          >
                            {batch.product?.barcode ||
                              batch.product?.material_code}
                          </span>
                        </div>
                        <div className="flex justify-between items-end mt-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`text-xs font-black uppercase tracking-widest ${selectedIndex === index ? "text-blue-100" : "text-gray-800"}`}
                            >
                              Availability: {batch.remain_qty} Units
                              <span className="mx-2 opacity-30">|</span>
                              <span className="opacity-60">
                                Initial:{" "}
                                {batch.no_cases * batch.pack_size +
                                  batch.extra_units +
                                  (batch.free_qty || 0)}{" "}
                                Units
                              </span>
                            </span>
                            <div className="flex gap-3 text-[10px] font-black uppercase tracking-tighter">
                              <span
                                className={
                                  selectedIndex === index
                                    ? "text-white"
                                    : "text-blue-500"
                                }
                              >
                                Normal:{" "}
                                {batch.remain_qty -
                                  (batch.free_qty || 0) -
                                  (batch.returned_qty || 0)}
                              </span>
                              {(batch.free_qty || 0) > 0 && (
                                <span
                                  className={
                                    selectedIndex === index
                                      ? "text-emerald-200"
                                      : "text-emerald-500"
                                  }
                                >
                                  Free: {batch.free_qty}
                                </span>
                              )}
                              {(batch.returned_qty || 0) > 0 && (
                                <span
                                  className={
                                    selectedIndex === index
                                      ? "text-orange-200"
                                      : "text-orange-500"
                                  }
                                >
                                  Returns: {batch.returned_qty}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-lg font-black text-xs border font-mono ${selectedIndex === index ? "bg-white/10 border-white/20 text-white" : "bg-blue-50 border-blue-100 text-blue-700"}`}
                            >
                              Net: Rs.{batch.netprice}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-lg font-black text-xs border font-mono ${selectedIndex === index ? "bg-white/10 border-white/20 text-white" : "bg-gray-50 border-gray-100 text-gray-700"}`}
                            >
                              Retail: Rs.{batch.retail_price}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden ring-1 ring-gray-100 transition-shadow hover:shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 backdrop-blur-md text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-8 py-6">Stock Identifier</th>
                        <th className="px-6 py-6 text-center">
                          Unit Breakdown
                        </th>
                        <th className="px-6 py-6 text-center">Net Price</th>
                        <th className="px-6 py-6 text-center">Retail Price</th>
                        <th className="px-6 py-6 text-center">Paid Qty</th>
                        <th className="px-6 py-6 text-right">Value (LKR)</th>
                        <th className="px-8 py-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-black text-gray-800">
                              {item.batch_stock?.product?.name}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {item.batch_stock?.product?.barcode ||
                                item.batch_stock?.product?.material_code}
                              <span className="mx-1.5 opacity-50">|</span>
                              Bat. Vol:{" "}
                              {(item.batch_stock?.no_cases || 0) *
                                (item.batch_stock?.pack_size || 0) +
                                (item.batch_stock?.extra_units || 0) +
                                (item.batch_stock?.free_qty || 0)}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="font-black text-gray-700 font-mono text-[11px] flex items-center justify-center gap-1.5">
                              {(() => {
                                const paidQty = item.qty - (item.free_qty || 0);
                                const packSize =
                                  item.batch_stock?.pack_size || 1;
                                return (
                                  <>
                                    <span>
                                      {Math.floor(paidQty / packSize)} x{" "}
                                      {packSize}
                                    </span>
                                    <span className="text-blue-500">
                                      + {paidQty % packSize}
                                    </span>
                                  </>
                                );
                              })()}
                              {item.free_qty > 0 && (
                                <span className="text-emerald-500">
                                  + {item.free_qty}
                                </span>
                              )}
                            </div>
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1 space-x-2">
                              <span>Total: {item.qty} Units</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-black text-gray-800 font-mono">
                              Rs. {Number(item.net_price).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-bold text-gray-500 font-mono">
                              Rs.{" "}
                              {Number(
                                item.batch_stock?.retail_price || 0,
                              ).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center font-black text-blue-700">
                            {item.qty - (item.free_qty || 0)}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-gray-900 font-mono">
                            Rs.{" "}
                            {(
                              Number(item.net_price) *
                              (Number(item.qty) - (Number(item.free_qty) || 0))
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleEditItem(item)}
                                className="text-blue-400 hover:text-blue-600 p-2 transition-colors"
                                title="Edit Quantity"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-400 hover:text-red-600 p-2 transition-colors"
                                title="Remove Item"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {loadingItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-30"
                          >
                            No items added
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Entry Modal */}
      {activeProduct && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  {editingItemId ? "Modify Entry" : "Add Stock to Loading"}
                </p>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">
                  {activeProduct.name}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  BARCODE:{" "}
                  {activeProduct?.barcode || activeProduct?.material_code}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveProduct(null);
                  setEditingItemId(null);
                }}
                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-5">
              {/* Selected Batch Details Instead of Dropdown */}
              {selectedBatch ? (
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Expiry Date
                    </p>
                    <p className="font-bold text-gray-800">
                      {selectedBatch?.expiry_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Total Avail.
                    </p>
                    <div className="flex flex-col items-end">
                      <p className="font-black text-blue-600 leading-none">
                        {selectedBatch?.remain_qty || 0}
                      </p>
                      {(selectedBatch?.returned_qty || 0) > 0 && (
                        <p className="text-[9px] font-bold text-orange-500 mt-0.5">
                          Incl. {selectedBatch?.returned_qty} Returns
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 contents">
                  <label className="font-bold text-gray-600 ml-0.5">
                    Select Batch
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-medium text-sm"
                    value={itemForm.batch_id}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, batch_id: e.target.value })
                    }
                  >
                    <option value="">-- Choose Batch --</option>
                    {productBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Exp: {b.expiry_date} | Avail: {b.remain_qty} units {(b.returned_qty || 0) > 0 ? `(Inc. ${b.returned_qty} Returns)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedBatch && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-3 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Pack Size
                    </p>
                    <p className="font-bold text-blue-900">
                      {selectedBatch.pack_size} units
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Net Price
                    </p>
                    <p className="font-bold text-blue-900">
                      Rs. {Number(selectedBatch.netprice || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-0.5">
                      Retail Price
                    </p>
                    <p className="font-bold text-orange-900">
                      Rs. {Number(selectedBatch.retail_price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-gray-500 ml-0.5">
                    Full Cases
                  </label>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 outline-none font-bold text-sm focus:border-blue-500 transition-colors"
                    value={itemForm.no_cases}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, no_cases: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-gray-500 ml-0.5">
                    Loose Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 outline-none font-bold text-sm focus:border-blue-500 transition-colors"
                    value={itemForm.loose_qty}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, loose_qty: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 ml-0.5">
                  Free Quantity (Units)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-100 outline-none font-black text-sm text-emerald-700 focus:border-emerald-500 transition-all shadow-sm"
                  placeholder="Enter free items in units..."
                  value={itemForm.free_qty}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, free_qty: e.target.value })
                  }
                />
              </div>

              <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                    Total Quantity
                  </p>
                  <p className="font-black text-gray-800 text-lg">
                    {currentTotalQty} Units
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                    Total Value
                  </p>
                  <p className="font-black text-blue-600 text-lg">
                    Rs.{" "}
                    {(
                      (Number(itemForm.no_cases) * currentPackSize +
                        Number(itemForm.loose_qty || 0)) *
                      (selectedBatch?.netprice || 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProduct(null);
                    setEditingItemId(null);
                  }}
                  className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedBatch || loading}
                  className="flex-[2] py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editingItemId
                      ? "Update Item"
                      : "Add to Manifest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Finalize Loading?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              This will save the loading manifest. Ensure all items are correct.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmSave(false)}
                className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-100"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Discard Manifest?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              All items added to this list will be lost. The manifest has not
              been saved to the database yet.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() =>
                  navigate("/supply-invoices", {
                    state: { activeTab: "loading" },
                  })
                }
                className="py-3 font-bold text-white bg-red-500 rounded-xl shadow-lg shadow-red-100"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loading;
