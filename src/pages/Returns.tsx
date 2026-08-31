import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  RefreshCw,
  Search,
  Package,
  CheckCircle2,
  RotateCcw,
  History,
  Truck as TruckIcon,
  MapPin,
  Calendar,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { useWarehouse } from "../context/WarehouseContext";

interface Loading {
  id: number;
  load_number: string;
  loading_date: string;
  status: string;
  truck?: {
    licence_plate_no: string;
    description: string;
  };
  route?: {
    route_code: string;
    route_description: string;
  };
  loading_items?: any[];
}

interface ToastNotification {
  text: string;
  type: "success" | "error" | "info";
}

const Returns: React.FC = () => {
  const { refreshTotalValue } = useWarehouse();
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // Manifests & Returns state
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [loadingLoadings, setLoadingLoadings] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Return Processing state
  const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{
    [key: number]: string;
  }>({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // History State
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnsError, setReturnsError] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");

  // Toast Notification
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Helper to ensure authorization header is attached
  const getAuthConfig = () => {
    const rawToken = localStorage.getItem("token");
    const token =
      rawToken && rawToken !== "null" && rawToken !== "undefined"
        ? rawToken.trim()
        : null;
    return {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  };

  const fetchLoadings = async () => {
    setLoadingLoadings(true);
    setLoadingError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/loadings`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLoadings(data);
    } catch (err: any) {
      console.error("Error fetching loadings:", err);
      setLoadingError(
        err.response?.data?.message ||
          "Unable to load manifests. Please check your connection.",
      );
    } finally {
      setLoadingLoadings(false);
    }
  };

  const fetchReturns = async () => {
    setReturnsLoading(true);
    setReturnsError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/returns`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setReturnsList(data);
    } catch (err: any) {
      console.error("Error fetching returns:", err);
      setReturnsError(
        err.response?.data?.message ||
          "Unable to load returns history. Please check your connection.",
      );
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadings();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchReturns();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    if (activeTab === "new") {
      await fetchLoadings();
    } else {
      await fetchReturns();
    }
  };

  const handleSelectLoading = (loading: Loading) => {
    setSelectedLoading(loading);
    setReturnQuantities({});
  };

  // Count items with valid return quantities
  const totalReturnUnits = useMemo(() => {
    return Object.values(returnQuantities).reduce((acc, qtyStr) => {
      const q = parseInt(qtyStr) || 0;
      return acc + q;
    }, 0);
  }, [returnQuantities]);

  const totalReturnLines = useMemo(() => {
    return Object.values(returnQuantities).filter((qtyStr) => {
      const q = parseInt(qtyStr) || 0;
      return q > 0;
    }).length;
  }, [returnQuantities]);

  const submitReturns = async () => {
    if (!selectedLoading) return;
    if (totalReturnUnits === 0) {
      showToast("Please enter at least one item quantity to return.", "error");
      return;
    }

    setSubmittingReturn(true);
    try {
      for (const batchIdStr in returnQuantities) {
        const qtyStr = returnQuantities[batchIdStr];
        const qty = parseInt(qtyStr);
        const batchId = parseInt(batchIdStr);

        if (!isNaN(qty) && qty > 0) {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/loadings/${selectedLoading.id}/returns`,
            {
              batch_id: batchId,
              qty: qty,
              return_date: new Date().toISOString().split("T")[0],
              reason: "Return processed via Returns Page",
            },
            getAuthConfig(),
          );
        }
      }

      showToast(
        `Successfully processed return of ${totalReturnUnits} unit(s) from Manifest #${selectedLoading.load_number}.`,
        "success",
      );
      refreshTotalValue();
      setSelectedLoading(null);
      setReturnQuantities({});
      setActiveTab("history");
    } catch (err: any) {
      console.error("Error processing returns:", err);
      showToast(
        err.response?.data?.message ||
          "Failed to process returns. Please check input quantities.",
        "error",
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Filter Loadings in Left Panel
  const filteredLoadings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return loadings;
    return loadings.filter(
      (l) =>
        l.load_number?.toLowerCase().includes(q) ||
        l.truck?.licence_plate_no?.toLowerCase().includes(q) ||
        l.route?.route_code?.toLowerCase().includes(q) ||
        l.route?.route_description?.toLowerCase().includes(q),
    );
  }, [loadings, searchTerm]);

  // Filter Returns History
  const filteredReturns = useMemo(() => {
    const q = historySearchTerm.trim().toLowerCase();
    if (!q) return returnsList;
    return returnsList.filter(
      (r) =>
        r.loading?.load_number?.toLowerCase().includes(q) ||
        r.batch_stock?.product?.name?.toLowerCase().includes(q) ||
        r.batch_stock?.product?.barcode?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.return_date?.toLowerCase().includes(q),
    );
  }, [returnsList, historySearchTerm]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl border shadow-lg flex items-center justify-between gap-3 text-sm animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : toast.type === "info"
                ? "bg-teal-50 border-teal-200 text-teal-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            )}
            <span className="font-medium">{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Stock & Reverse Logistics
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Returns Management
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Process stock returns from delivery trucks and view reverse logistics history.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loadingLoadings || returnsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 active:bg-stone-100 text-slate-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:opacity-60 shadow-xs cursor-pointer"
          >
            <RefreshCw
              size={16}
              className={`text-slate-600 ${
                loadingLoadings || returnsLoading ? "animate-spin" : ""
              }`}
            />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-stone-200 rounded-xl shadow-xs overflow-x-auto max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "new"
              ? "bg-teal-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/80"
          }`}
        >
          <RotateCcw
            size={16}
            className={activeTab === "new" ? "text-teal-200" : "text-slate-500"}
          />
          <span>Create New Return</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "history"
              ? "bg-teal-800 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/80"
          }`}
        >
          <History
            size={16}
            className={activeTab === "history" ? "text-teal-200" : "text-slate-500"}
          />
          <span>Return History</span>
          {returnsList.length > 0 && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                activeTab === "history"
                  ? "bg-teal-900/60 text-teal-100"
                  : "bg-stone-100 text-slate-600"
              }`}
            >
              {returnsList.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CREATE NEW RETURN (TWO-COLUMN SPLIT LAYOUT) */}
      {activeTab === "new" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Select Loading Manifest */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[520px]">
            {/* Left Header */}
            <div className="p-4 border-b border-stone-200 bg-stone-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Select Manifest
                </h3>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  {filteredLoadings.length} {filteredLoadings.length === 1 ? "record" : "records"}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={15} />
                </div>
                <input
                  type="text"
                  placeholder="Search load #, truck, route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-all font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Manifest List Content */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2.5 divide-y-0">
              {loadingLoadings ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-stone-100 rounded-xl animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : loadingError ? (
                <div className="p-6 text-center text-red-600 text-xs font-medium">
                  <AlertCircle size={20} className="mx-auto mb-2 text-red-500" />
                  <p>{loadingError}</p>
                </div>
              ) : filteredLoadings.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">No manifests found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {searchTerm ? "Try another search keyword." : "No loading records available."}
                  </p>
                </div>
              ) : (
                filteredLoadings.map((load) => {
                  const isSelected = selectedLoading?.id === load.id;
                  const isDelivered =
                    load.status?.toLowerCase() === "delivered" ||
                    load.status?.toLowerCase() === "completed";
                  const isPending =
                    load.status?.toLowerCase() === "pending" ||
                    load.status?.toLowerCase() === "in_transit";

                  return (
                    <div
                      key={load.id}
                      onClick={() => handleSelectLoading(load)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? "border-teal-700 bg-teal-50/40 ring-1 ring-teal-700/30 shadow-xs"
                          : "border-stone-200 hover:border-teal-600/50 hover:bg-stone-50/80 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 bg-stone-100 border border-stone-200 rounded">
                          #{load.load_number}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full ${
                            isDelivered
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isPending
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-stone-100 text-slate-600 border border-stone-200"
                          }`}
                        >
                          {load.status || "DELIVERED"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>{load.loading_date}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-stone-100">
                        <div className="flex items-center gap-1.5 truncate">
                          <TruckIcon size={13} className="text-slate-400 shrink-0" />
                          <span className="font-mono font-medium truncate">
                            {load.truck?.licence_plate_no || "N/A"}
                          </span>
                        </div>
                        {load.route?.route_code && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 shrink-0">
                            <MapPin size={11} />
                            <span>{load.route.route_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Return Items Selection Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[520px]">
            {/* Right Header */}
            <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Select Items to Return
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter returning unit counts for items dispatched in this loading run.
                </p>
              </div>
              {selectedLoading && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Selected Manifest:</span>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-md">
                    #{selectedLoading.load_number}
                  </span>
                </div>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-slate-400 mb-3">
                    <Package size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No Loading Manifest Selected
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Select a loading manifest from the left panel to review dispatched inventory and record returned stock.
                  </p>
                </div>
              ) : (selectedLoading.loading_items?.length || 0) === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-slate-400 mb-3">
                    <Package size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No Loaded Items Found
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    This loading manifest contains no item line entries.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3">Product Description</th>
                        <th className="py-3 px-3 text-center">Batch No</th>
                        <th className="py-3 px-3 text-center">Dispatched Qty</th>
                        <th className="py-3 px-3 text-center w-36">Returning Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                      {selectedLoading.loading_items?.map((item: any) => {
                        const batchStockId =
                          item.batch_stock?.id || item.batch_id;
                        const maxQty = item.qty || 0;
                        const currentVal =
                          returnQuantities[batchStockId] || "";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-teal-50/20 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-900">
                                {item.batch_stock?.product?.name || "Product"}
                              </p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">
                                {item.batch_stock?.product?.barcode || "—"}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-slate-700 border border-stone-200">
                                {item.batch_stock?.batch_number ||
                                  `ID:${item.batch_id}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              {maxQty}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={maxQty}
                                placeholder="0"
                                value={currentVal}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (isNaN(val) || val < 0) val = 0;
                                  if (val > maxQty) val = maxQty;
                                  setReturnQuantities({
                                    ...returnQuantities,
                                    [batchStockId]:
                                      val > 0 ? val.toString() : "",
                                  });
                                }}
                                className={`w-28 border rounded-lg px-2.5 py-1.5 text-center font-bold text-sm outline-none transition-all ${
                                  parseInt(currentVal) > 0
                                    ? "border-teal-700 bg-teal-50/30 text-teal-900 ring-1 ring-teal-700/20"
                                    : "border-stone-300 bg-white text-slate-800 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Footer Actions */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                {selectedLoading ? (
                  <span>
                    Items to return:{" "}
                    <strong className="text-slate-900">{totalReturnLines}</strong> line(s) (
                    <strong className="text-teal-900">{totalReturnUnits} units</strong>)
                  </span>
                ) : (
                  <span>Select a manifest to enable processing</span>
                )}
              </div>

              <button
                type="button"
                onClick={submitReturns}
                disabled={
                  !selectedLoading ||
                  submittingReturn ||
                  totalReturnUnits === 0
                }
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingReturn ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Processing Returns…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Returns</span>
                    <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RETURN HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* History Search & Stats Toolbar */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                placeholder="Search return history by manifest, product, barcode, or reason..."
                className="w-full pl-9 pr-9 py-2 text-sm bg-stone-50/70 border border-stone-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/20 transition-all"
              />
              {historySearchTerm && (
                <button
                  type="button"
                  onClick={() => setHistorySearchTerm("")}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-xs sm:text-sm text-slate-600 font-medium md:text-right shrink-0">
              {returnsLoading ? (
                <span>Loading history…</span>
              ) : historySearchTerm.trim() ? (
                <span>
                  Showing <strong className="text-slate-900">{filteredReturns.length}</strong> of{" "}
                  {returnsList.length} returns
                </span>
              ) : (
                <span>
                  Total <strong className="text-slate-900">{returnsList.length}</strong> returns
                </span>
              )}
            </div>
          </div>

          {/* History Error State */}
          {returnsError && !returnsLoading && (
            <div
              role="alert"
              className="bg-white border border-red-200 rounded-xl p-8 shadow-sm text-center animate-in fade-in duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Unable to load return history
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {returnsError}
              </p>
              <button
                type="button"
                onClick={fetchReturns}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 shadow-xs cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* History Data Table Card */}
          {!returnsError && (
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6">Return Date</th>
                      <th className="py-3.5 px-4 sm:px-6">Manifest Ref</th>
                      <th className="py-3.5 px-4 sm:px-6">Product Details</th>
                      <th className="py-3.5 px-4 sm:px-6 text-center">Batch Code</th>
                      <th className="py-3.5 px-4 sm:px-6 text-center">Qty Returned</th>
                      <th className="py-3.5 px-4 sm:px-6">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {returnsLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 px-6 text-center text-slate-400 font-medium"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin text-teal-800" />
                            <span>Loading return history…</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredReturns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <History size={36} className="text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-700 text-sm">
                              No returns found
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {historySearchTerm
                                ? "Try adjusting your search query."
                                : "No returned stock transactions have been recorded yet."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredReturns.map((ret: any) => (
                        <tr
                          key={ret.id}
                          className="hover:bg-teal-50/20 transition-colors"
                        >
                          <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                            {ret.return_date}
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-semibold text-slate-800">
                            <span className="px-2 py-0.5 bg-stone-100 border border-stone-200 rounded">
                              #{ret.loading?.load_number || ret.loading_id || "N/A"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <p className="font-semibold text-slate-900">
                              {ret.batch_stock?.product?.name || "Product"}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {ret.batch_stock?.product?.barcode || "—"}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-center">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-slate-700 border border-stone-200">
                              {ret.batch_stock?.batch_number || `ID:${ret.batch_id}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-center">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                              {ret.qty} units
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-slate-600 text-xs">
                            {ret.reason || <span className="text-slate-400 italic">No notes</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Returns;
