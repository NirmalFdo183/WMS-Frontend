import React, { useState, useEffect } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { Eye, Search, RefreshCw, X, Printer } from "lucide-react";

interface BatchStock {
  id: number;
  product: {
    name: string;
    material_code: string;
    barcode: string;
  };
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

const SupplyInvoices = () => {
  const location = useLocation();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] =
    useState<SupplierInvoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "supply" | "shop" | "loading" | "sales"
  >("supply");
  const [modalLoading, setModalLoading] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

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

  // Loading State
  const [loadings, setLoadings] = useState<any[]>([]);
  const [statusConfirmation, setStatusConfirmation] = useState<{
    id: number;
    status: string;
  } | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { totalValue, refreshTotalValue } = useWarehouse();

  const fetchInvoices = async () => {
    setLoading(true);

    // Fetch Supply Invoices
    try {
      const supplyRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`,
      );
      setInvoices(supplyRes.data);
    } catch (err) {
      console.error("Error fetching supply invoices:", err);
      // Don't set failure state here, just log it so one failure doesn't break the page
    }

    // Fetch Loading Manifests
    try {
      const loadingRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/loadings`,
      );
      setLoadings(loadingRes.data);
      setLoadingError(null);
    } catch (err) {
      console.error("Error fetching loadings:", err);
      setLoadingError("Failed to load manifests from server.");
    }

    // Fetch Sales Invoices
    try {
      const salesRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/sales`,
      );
      setSales(salesRes.data);
    } catch (err) {
      console.error("Error fetching sales:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ... (rest of the existing handlers)

  const handleInvoiceClick = async (id: number) => {
    try {
      setModalLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${id}`,
      );
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      alert("Failed to load invoice details.");
    } finally {
      setModalLoading(false);
    }
  };

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
      // Update local state
      setLoadings(
        loadings.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
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

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnLoadingId, setReturnLoadingId] = useState<number | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<{
    [key: number]: string;
  }>({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const handleReturnClick = (loading: any) => {
    setReturnLoadingId(loading.id);
    setReturnItems(loading.loading_items || []);
    setReturnQuantities({});
    setReturnModalOpen(true);
  };

  const submitReturns = async () => {
    if (!returnLoadingId) return;

    setSubmittingReturn(true);
    try {
      // Process each batch return sequentially
      for (const batchIdStr in returnQuantities) {
        const qtyStr = returnQuantities[batchIdStr];
        const qty = parseInt(qtyStr);
        const batchId = parseInt(batchIdStr);

        if (!isNaN(qty) && qty > 0) {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/loadings/${returnLoadingId}/returns`,
            {
              batch_id: batchId,
              qty: qty,
              return_date: new Date().toISOString().split("T")[0], // Today
              reason: "Returned from loading",
            },
          );
        }
      }

      alert("Returns processed successfully!");
      setReturnModalOpen(false);
      setReturnLoadingId(null);
      setReturnItems([]);
      setReturnQuantities({});
      fetchInvoices(); // Refresh data to show stock updates if needed (though stock updates are on backend)
    } catch (err: any) {
      console.error("Error processing returns:", err);
      alert(err.response?.data?.message || "Failed to process returns.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  const [selectedLoading, setSelectedLoading] = useState<any | null>(null);

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

  const handlePrintLoading = (load: any) => {
    setSelectedLoading(load);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const SalesTable = () => {
    if (loading)
      return (
        <div className="p-10 text-center text-gray-500">Loading sales...</div>
      );
    if (sales.length === 0)
      return (
        <div className="p-10 text-center text-gray-500">
          No sales invoices found.
        </div>
      );

    const filteredSales = sales.filter((s) => {
      const searchStr = searchTerm.toLowerCase();
      return (
        s.id.toString().includes(searchStr) ||
        (s.user?.name && s.user.name.toLowerCase().includes(searchStr))
      );
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
              <th className="px-6 py-4 text-left">Invoice #</th>
              <th className="px-6 py-4">Date & Time</th>
              <th className="px-6 py-4">Cashier</th>
              <th className="px-6 py-4 text-right">Total Amount</th>
              <th className="px-6 py-4 text-center">Payment</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSales.map((sale) => (
              <tr
                key={sale.id}
                className="hover:bg-blue-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <span className="font-bold text-blue-600 block">
                    S-{sale.id.toString().padStart(6, "0")}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="text-gray-800 font-medium text-sm">
                    {new Date(sale.date_time).toLocaleString()}
                  </p>
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="font-bold text-gray-800 text-sm">
                    {sale.user?.name || "System"}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">
                    Rs.{" "}
                    {Number(sale.total).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sale.payment_type === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
                  >
                    {sale.payment_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedSale(sale)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 ml-auto"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const LoadingTable = () => {
    if (loading)
      return (
        <div className="p-10 text-center text-gray-500">Loading data...</div>
      );
    if (loadingError)
      return (
        <div className="p-10 text-center text-red-500 font-bold">
          {loadingError}
        </div>
      );
    if (loadings.length === 0)
      return (
        <div className="p-10 text-center text-gray-500">
          No loading manifests found.
        </div>
      );

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <th className="px-6 py-4">Load Ref</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Vehicle & Personnel</th>
              <th className="px-6 py-4">Territory/Route</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loadings.map((load) => (
              <tr
                key={load.id}
                className="hover:bg-blue-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <span className="font-black text-blue-600 block">
                    #{load.load_number}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-800 font-medium text-sm">
                    {load.loading_date}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-800 text-sm">
                    {load.truck?.licence_plate_no}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[150px]">
                    {load.truck?.description || "No description"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-black text-gray-900 text-sm">
                    {load.route?.route_code}
                  </p>
                  <p className="text-[10px] text-gray-400 italic">
                    {load.route?.route_description}
                  </p>
                </td>
                <td className="px-6 py-4 text-center">
                  <select
                    value={load.status}
                    onChange={(e) =>
                      handleUpdateStatus(load.id, e.target.value)
                    }
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter outline-none cursor-pointer border
                                      ${
                                        load.status === "delivered"
                                          ? "bg-green-100 text-green-700 border-green-200"
                                          : load.status === "pending"
                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                            : "bg-red-100 text-red-700 border-red-200"
                                      }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="not_delivered">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleReturnClick(load)}
                      className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                      title="Process Returns"
                    >
                      <RefreshCw size={14} />
                      Return
                    </button>
                    <button
                      onClick={() => handlePrintLoading(load)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                      title="Print Load List"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                    <button
                      onClick={() => setSelectedLoading(load)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-2"
                      title="View Details"
                    >
                      <Eye size={14} />
                      View Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.supplier?.name &&
        inv.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Invoices & Manifests
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            View and manage all types of invoices and delivery manifests.
          </p>
        </div>
        <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-blue-100">
            Total Warehouse Value
          </p>
          <p className="text-2xl font-black">
            Rs.{" "}
            {Number(totalValue).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-10 overflow-x-auto no-scrollbar max-w-fit">
        {[
          { id: "supply", label: "Supply Invoices" },
          { id: "loading", label: "Loading Invoices" },
          { id: "sales", label: "Sales Invoices" },
          { id: "shop", label: "Shop Invoices" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "supply" && (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
                Supply Invoices Report
              </h2>
              <p className="text-sm text-gray-500">
                History of all inventory stock updates
              </p>
            </div>

            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search invoice or supplier..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none w-full sm:w-80 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
                  <th className="px-6 py-4 text-left">Invoice No</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      onClick={() => handleInvoiceClick(inv.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600">
                          #{inv.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {inv.invoice_date}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-800">
                        {inv.supplier?.name || `ID: ${inv.supplier_id}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-gray-900">
                          Rs.{" "}
                          {Number(inv.total_bill_amount).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvoiceClick(inv.id);
                            }}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-2"
                            title="View Details"
                          >
                            <Eye size={14} />
                            View Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "sales" && (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
                Sales Invoices Report
              </h2>
              <p className="text-sm text-gray-500">
                Direct customer transactions (Completed)
              </p>
            </div>

            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search invoice or cashier..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none w-full sm:w-80 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
            <SalesTable />
          </div>
        </>
      )}

      {activeTab === "shop" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 tracking-tight">
            Shop Invoices
          </h3>
          <p className="text-gray-500 mt-2">
            This module is under development. You will be able to view and
            manage shop invoices here soon.
          </p>
        </div>
      )}

      {activeTab === "loading" && (
        <>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
              Loading Manifests
            </h2>
            <p className="text-sm text-gray-500">
              History of outbound truck loads
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
            <LoadingTable />
          </div>
        </>
      )}

      {/* RETURNS MODAL */}
      {returnModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-5 sm:px-8 py-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                  <RefreshCw size={20} className="text-orange-600" />
                  Process Returns
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                  Select items and quantities returned from Loading #
                  {loadings.find((l) => l.id === returnLoadingId)?.load_number}
                </p>
              </div>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto max-h-[60vh]">
              {returnItems.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No items found in this loading.
                </div>
              ) : (
                <div className="space-y-4">
                  <table className="w-full text-left bg-white border border-gray-100 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-center">Loaded Qty</th>
                        <th className="px-4 py-3 text-center w-32">
                          Return Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {returnItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-800">
                              {item.batch_stock?.product?.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {item.batch_stock?.product?.barcode ||
                                item.batch_stock?.product?.material_code}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700">
                            {item.qty}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.qty}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-center font-bold outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                              placeholder="0"
                              value={
                                returnQuantities[item.batch_stock?.id] || ""
                              }
                              onChange={(e) => {
                                let val = parseInt(e.target.value);
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
                  <p className="text-[10px] text-gray-400 italic text-center">
                    Note: Returned items will be added back to stock and
                    prioritized for future sales.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 grid-cols-2">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submittingReturn}
              >
                Cancel
              </button>
              <button
                onClick={submitReturns}
                disabled={submittingReturn}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReturn ? "Processing..." : "Confirm Returns"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 text-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="px-5 sm:px-8 py-4 sm:py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
                  Invoice Details
                </h2>
                <p className="text-blue-600 font-mono font-bold text-xs sm:text-sm">
                  #{selectedInvoice.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6"
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

            <div className="p-5 sm:p-8 overflow-y-auto">
              {modalLoading ? (
                <div className="py-20 text-center text-gray-500 font-bold">
                  Fetching items...
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-blue-50/50 p-4 sm:p-6 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">
                        Supplier
                      </p>
                      <p className="text-sm sm:text-lg font-bold text-gray-800 truncate">
                        {selectedInvoice.supplier?.name ||
                          selectedInvoice.supplier_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">
                        Billing Date
                      </p>
                      <p className="text-sm sm:text-lg font-bold text-gray-800">
                        {selectedInvoice.invoice_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">
                        Invoice Total
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-700">
                        Rs.{" "}
                        {Number(
                          selectedInvoice.total_bill_amount,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                      Stocked Items List
                    </h3>
                    <div className="border border-gray-100 rounded-xl overflow-x-auto no-scrollbar">
                      <table className="w-full text-left min-w-[700px]">
                        <thead>
                          <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Product Specs</th>
                            <th className="px-4 py-4 text-center">
                              Batch Vol.
                            </th>
                            <th className="px-4 py-4 text-center">Free Qty</th>
                            <th className="px-4 py-4 text-right">Net Price</th>
                            <th className="px-4 py-4 text-right">
                              Retail Price
                            </th>
                            <th className="px-6 py-4 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedInvoice.batch_stocks?.map((item) => (
                            <tr
                              key={item.id}
                              className="text-xs hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-800">
                                  {item.product.name}
                                </p>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                  {item.product.barcode ||
                                    item.product.material_code}
                                </p>
                                {item.expiry_date && (
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    EXP: {item.expiry_date}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <p className="font-bold text-gray-700">
                                  {item.no_cases} × {item.pack_size} +{" "}
                                  {item.extra_units} + {item.free_qty}
                                </p>
                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter mt-0.5 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                                  {item.no_cases * item.pack_size +
                                    item.extra_units +
                                    (item.free_qty || 0)}{" "}
                                  Total Units
                                </p>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <p className="font-bold text-green-600 leading-none">
                                  {item.free_qty || 0}
                                </p>
                                {item.free_qty > 0 && (
                                  <p className="text-[9px] text-gray-400 font-black uppercase mt-1.5">
                                    Rs.{" "}
                                    {(
                                      item.free_qty * item.netprice
                                    ).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right font-medium">
                                Rs. {Number(item.netprice).toFixed(2)}
                              </td>
                              <td className="px-4 py-4 text-right font-medium">
                                Rs. {Number(item.retail_price).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900">
                                Rs.{" "}
                                {(
                                  (Number(item.no_cases) *
                                    Number(item.pack_size) +
                                    Number(item.extra_units || 0)) *
                                  Number(item.netprice)
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LOADING DETAIL MODAL */}
      {selectedLoading && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-5 sm:px-8 py-4 sm:py-6 bg-blue-600 border-b border-blue-700 flex justify-between items-center text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  Loading Manifest Report
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
                  #{selectedLoading.load_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLoading(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-blue-50/30 p-5 rounded-2xl border border-blue-100 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Date / Logistics
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedLoading.loading_date}
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 truncate">
                    {selectedLoading.truck?.licence_plate_no}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Assignments
                  </p>
                  <p className="font-bold text-gray-800">
                    Rep: {selectedLoading.sales_rep?.name || "-"}
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 italic">
                    {selectedLoading.route?.route_code}
                  </p>
                </div>
                <div className="col-span-2 space-y-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Field Personnel
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-blue-50 shadow-sm">
                      <p className="text-[8px] font-black text-gray-400 uppercase">
                        Driver
                      </p>
                      <p className="text-[10px] font-bold text-gray-700 truncate">
                        {selectedLoading.driver?.name || "-"}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-50 shadow-sm">
                      <p className="text-[8px] font-black text-gray-400 uppercase">
                        Helper
                      </p>
                      <p className="text-[10px] font-bold text-gray-700 truncate">
                        {selectedLoading.helper?.name || "-"}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-50 shadow-sm">
                      <p className="text-[8px] font-black text-gray-400 uppercase">
                        Cashier
                      </p>
                      <p className="text-[10px] font-bold text-gray-700 truncate">
                        {selectedLoading.cash_collector?.name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Manifest Items
                </h3>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-6 py-4">Product Details</th>
                        <th className="px-4 py-4 text-center">Batch Vol.</th>
                        <th className="px-4 py-4 text-center">Free Qty</th>
                        <th className="px-4 py-4 text-right">Net Price</th>
                        <th className="px-4 py-4 text-right text-orange-600">
                          Retail
                        </th>
                        <th className="px-6 py-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {selectedLoading.loading_items?.map((item: any) => {
                        const netPrice = Number(item.net_price || 0);
                        const retailPrice = Number(
                          item.batch_stock?.retail_price || 0,
                        );

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-900">
                                {item.batch_stock?.product?.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {item.batch_stock?.product?.barcode ||
                                  item.batch_stock?.product?.material_code}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <p className="font-bold text-gray-800">
                                {Math.floor(
                                  (item.qty - (item.free_qty || 0)) /
                                    (item.batch_stock?.pack_size || 1),
                                )}{" "}
                                × {item.batch_stock?.pack_size || 1} +{" "}
                                {(item.qty - (item.free_qty || 0)) %
                                  (item.batch_stock?.pack_size || 1)}{" "}
                                + {item.free_qty || 0}
                              </p>
                              <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter mt-0.5 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                                {item.qty} Total Units
                              </p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {item.free_qty > 0 ? (
                                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">
                                  +{item.free_qty} Free
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="px-4 py-4 text-right font-medium">
                              Rs. {netPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-4 text-right text-orange-700">
                              Rs. {retailPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-blue-600">
                              Rs.{" "}
                              {(
                                (Number(item.qty) -
                                  Number(item.free_qty || 0)) *
                                netPrice
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50 border-t border-emerald-100">
                        <td
                          colSpan={5}
                          className="px-6 py-3 text-right text-[10px] font-black uppercase text-emerald-600"
                        >
                          Value of Free Items
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-emerald-700">
                          Rs.{" "}
                          {selectedLoading.loading_items
                            ?.reduce(
                              (sum: number, item: any) =>
                                sum +
                                Number(item.free_qty || 0) *
                                  Number(item.net_price || 0),
                              0,
                            )
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                        </td>
                      </tr>
                      <tr className="bg-blue-600">
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-right text-[10px] font-black uppercase text-blue-100"
                        >
                          Manifest Grand Total
                        </td>
                        <td className="px-6 py-4 text-right text-base font-black text-white">
                          Rs.{" "}
                          {selectedLoading.loading_items
                            ?.reduce(
                              (sum: number, item: any) =>
                                sum +
                                (Number(item.qty) -
                                  Number(item.free_qty || 0)) *
                                  Number(item.net_price || 0),
                              0,
                            )
                            .toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLoading(null)}
                className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusConfirmation && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                statusConfirmation.status === "delivered"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {statusConfirmation.status === "delivered" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
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
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Update Status?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Are you sure you want to mark this manifest as{" "}
              <span className="font-bold text-gray-900 uppercase">
                {statusConfirmation.status.replace("_", " ")}
              </span>
              ? This action will update inventory stock.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatusConfirmation(null)}
                className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
              >
                No, Keep
              </button>
              <button
                onClick={() =>
                  performStatusUpdate(
                    statusConfirmation.id,
                    statusConfirmation.status,
                  )
                }
                className={`flex-1 py-3 font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${
                  statusConfirmation.status === "delivered"
                    ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                    : "bg-red-600 hover:bg-red-700 shadow-red-200"
                }`}
              >
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SALE DETAIL MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-5 sm:px-8 py-4 sm:py-6 bg-blue-600 border-b border-blue-700 flex justify-between items-center text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  Sales Invoice Detail
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  S-{selectedSale.id.toString().padStart(6, "0")}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-blue-50/30 p-5 rounded-2xl border border-blue-100 mb-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Sales Date
                  </p>
                  <p className="font-bold text-gray-800">
                    {new Date(selectedSale.date_time).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] font-bold text-blue-600">
                    {new Date(selectedSale.date_time).toLocaleTimeString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Cashier / User
                  </p>
                  <p className="font-bold text-gray-800">
                    {selectedSale.user?.name || "System"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Payment Method
                  </p>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black text-[10px] uppercase">
                    {selectedSale.payment_type}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    Grand Total
                  </p>
                  <p className="text-2xl font-black text-blue-700">
                    Rs.{" "}
                    {Number(selectedSale.total).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Purchased Items
                </h3>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-6 py-4">Product Name</th>
                        <th className="px-4 py-4 text-center">Qty (Units)</th>
                        <th className="px-4 py-4 text-right">Retail Price</th>
                        <th className="px-4 py-4 text-right">Discount</th>
                        <th className="px-6 py-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {selectedSale.items?.map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">
                              {item.product?.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              Batch: #{item.batch_id}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-700">
                            {item.qty}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-gray-600">
                            Rs.{" "}
                            {Number(
                              item.retail_price ||
                                item.batch_stock?.retail_price ||
                                item.unit_price,
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-red-500">
                            - Rs.{" "}
                            {Number(item.discount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-blue-600">
                            Rs.{" "}
                            {Number(item.total).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE LOAD LIST */}
      <div
        id="printable-loadlist"
        className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-serif text-black overflow-y-auto"
      >
        {selectedLoading && (
          <div className="w-full">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black uppercase tracking-widest">
                THEJANI TRADERS - CHILAW
              </h1>
              <h2 className="text-lg font-bold uppercase mt-1">Load List</h2>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-6 text-[11px] font-bold">
              <div className="space-y-1">
                <p>
                  <span className="w-32 inline-block">Load Number</span> :{" "}
                  {selectedLoading.load_number}
                </p>
                <p>
                  <span className="w-32 inline-block">Vehicle</span> :{" "}
                  {selectedLoading.truck?.licence_plate_no}
                </p>
                <p>
                  <span className="w-32 inline-block">Territory</span> :{" "}
                  {selectedLoading.route?.route_code || "CHL1"}
                </p>
                <p>
                  <span className="w-32 inline-block">Executive</span> :{" "}
                  {selectedLoading.sales_rep?.name || "-"}
                </p>
                <p>
                  <span className="w-32 inline-block">Town</span> :{" "}
                  {selectedLoading.route?.route_description || "CHILAW TOWN"}
                </p>
              </div>
              <div className="space-y-1">
                <p>
                  <span className="w-32 inline-block">Created On</span> :{" "}
                  {new Date(selectedLoading.created_at).toLocaleDateString()}{" "}
                  {new Date(selectedLoading.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p>
                  <span className="w-32 inline-block">Delivery Date</span> :{" "}
                  {selectedLoading.loading_date}
                </p>
                <p>
                  <span className="w-32 inline-block">Created By</span> : ADMIN
                </p>
                <p>
                  <span className="w-32 inline-block">Delivery Route</span> :{" "}
                  {selectedLoading.route?.route_code}
                </p>
              </div>
            </div>

            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-y-2 border-black">
                  <th className="py-2 text-left w-1/4">
                    Product Code & Description
                  </th>
                  <th className="py-2 text-center">Case</th>
                  <th className="py-2 text-center">Units</th>
                  <th className="py-2 text-right">WH Price</th>
                  <th className="py-2 text-right">RT Price</th>
                  <th className="py-2 text-center">Free (Case)</th>
                  <th className="py-2 text-center">Free (Units)</th>
                  <th className="py-2 text-right">Total Qty (Units)</th>
                  <th className="py-2 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group items by brand
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
                      <tr className="border-b border-gray-300">
                        <td
                          colSpan={9}
                          className="py-2 font-black uppercase text-xs tracking-wider"
                        >
                          {brand}
                        </td>
                      </tr>
                      {items.map((item: any) => {
                        const packSize = item.batch_stock?.pack_size || 1;
                        const mainQty = item.qty - (item.free_qty || 0);
                        const cases = Math.floor(mainQty / packSize);
                        const units = mainQty % packSize;

                        const freeCases = Math.floor(
                          (item.free_qty || 0) / packSize,
                        );
                        const freeUnits = (item.free_qty || 0) % packSize;

                        const netPrice = Number(item.net_price || 0);
                        const retailPrice = Number(
                          item.batch_stock?.retail_price || 0,
                        );
                        const lineTotal = mainQty * netPrice;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100"
                          >
                            <td className="py-1">
                              <p className="font-bold">
                                {item.batch_stock?.product?.material_code}
                              </p>
                              <p>{item.batch_stock?.product?.name}</p>
                            </td>
                            <td className="py-1 text-center font-bold">
                              {cases > 0 ? cases : ""}
                            </td>
                            <td className="py-1 text-center font-bold">
                              {units > 0 ? units : ""}
                            </td>
                            <td className="py-1 text-right">
                              {netPrice.toFixed(2)}
                            </td>
                            <td className="py-1 text-right">
                              {retailPrice.toFixed(2)}
                            </td>
                            <td className="py-1 text-center">
                              {freeCases > 0 ? freeCases : ""}
                            </td>
                            <td className="py-1 text-center">
                              {freeUnits > 0 ? freeUnits : ""}
                            </td>
                            <td className="py-1 text-right font-black">
                              {item.qty}
                            </td>
                            <td className="py-1 text-right font-black">
                              {lineTotal.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black">
                  <td
                    colSpan={8}
                    className="py-3 text-right font-black text-sm uppercase"
                  >
                    Total Manifest Value:
                  </td>
                  <td className="py-3 text-right font-black text-sm">
                    Rs.{" "}
                    {selectedLoading.loading_items
                      ?.reduce(
                        (sum: number, item: any) =>
                          sum +
                          (item.qty - (item.free_qty || 0)) *
                            Number(item.net_price || 0),
                        0,
                      )
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="mt-12 flex justify-between text-xs font-bold italic">
              <p>Prepared By: _________________</p>
              <p>Authorized By: _________________</p>
              <p>Received By: _________________</p>
            </div>

            <p className="text-center mt-12 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Generated via Thejani Traders WMS
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-loadlist, #printable-loadlist * {
            visibility: visible;
          }
          #printable-loadlist {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            visibility: visible;
            display: block !important;
          }
          @page {
            margin: 1cm;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  );
};

export default SupplyInvoices;
