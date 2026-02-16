import { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

interface BatchStock {
  id: number;
  qty: number; // Available quantity
  pack_size: number;
  expiry_date: string;
  retail_price?: number;
  netprice?: number;
  product?: Product;
  supplier_invoice_id: number;
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

  // Loading Header State
  const [loadingData, setLoadingData] = useState({
    id: null as number | null,
    load_number: "",
    truck_id: "",
    route_id: "",
    loading_date: new Date().toISOString().split("T")[0],
    status: "pending",
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
        const [trucksRes, routesRes, batchesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/trucks`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/routes`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks`),
        ]);
        setTrucks(trucksRes.data);
        setRoutes(routesRes.data);
        setAllBatches(batchesRes.data);
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
      return (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
      wh_price: batch.netprice?.toString() || "",
      net_price: batch.retail_price?.toString() || "",
    });
  };

  const handleCreateLoading = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("items");
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (currentTotalQty > selectedBatch.qty) {
      alert(
        `Insufficient stock! Available: ${selectedBatch.qty}, Requested: ${currentTotalQty}`,
      );
      return;
    }

    const whPriceNum = Number(itemForm.wh_price);
    const netPriceNum = Number(selectedBatch.netprice || 0);
    const retailPriceNum = Number(selectedBatch.retail_price || 0);

    if (whPriceNum <= netPriceNum) {
      alert(
        `Wholesale price must be greater than Net Price (Rs. ${netPriceNum.toFixed(2)})`,
      );
      return;
    }
    if (whPriceNum >= retailPriceNum) {
      alert(
        `Wholesale price must be lower than Retail Price (Rs. ${retailPriceNum.toFixed(2)})`,
      );
      return;
    }

    const newItem = {
      id: editingItemId || Date.now(),
      batch_id: selectedBatch.id,
      qty:
        Number(itemForm.no_cases) * currentPackSize +
        Number(itemForm.loose_qty || 0),
      free_qty: Number(itemForm.free_qty || 0),
      wh_price: whPriceNum,
      net_price: retailPriceNum, // Keep retail price as 'net_price' for backend consistency
      batch_stock: selectedBatch, // Store the whole batch for table rendering
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

    const packs = Math.floor(item.qty / (item.batch_stock.pack_size || 1));
    const loose = item.qty % (item.batch_stock.pack_size || 1);

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
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              New Loading Sheet
            </h1>
            <p className="text-sm text-gray-500">
              Create loading manifest and assign stock
            </p>
          </div>

          {step === "items" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmCancel(true)}
                className="px-4 py-2 rounded-lg font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmSave(true)}
                className="px-5 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm shadow-sm"
              >
                Complete Loading
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {step === "details" ? (
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">
                Loading Details
              </h2>
            </div>

            <form onSubmit={handleCreateLoading} className="p-6 space-y-5">
              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                    Load Number
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={loadingData.load_number}
                    onChange={(e) =>
                      setLoadingData({
                        ...loadingData,
                        load_number: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                      Truck
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                      Route
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      value={loadingData.route_id}
                      onChange={(e) =>
                        setLoadingData({
                          ...loadingData,
                          route_id: e.target.value,
                        })
                      }
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

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                      Loading Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Start Loading Items
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Info Card */}
            <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Load No
                  </p>
                  <p className="font-black text-gray-800 text-lg">
                    #{loadingData.load_number}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Route
                  </p>
                  <p className="font-bold text-gray-800 text-sm">
                    {routes.find(
                      (r) => r.id.toString() === loadingData.route_id,
                    )?.route_code || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Truck
                  </p>
                  <p className="font-bold text-gray-800 text-sm">
                    {trucks.find(
                      (t) => t.id.toString() === loadingData.truck_id,
                    )?.licence_plate_no || "N/A"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Total Items
                </p>
                <p className="text-xl font-black text-blue-600">
                  {loadingItems.length}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white outline-none font-medium text-sm"
                placeholder="Scan Barcode / Search Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto z-10 relative">
                  {searchResults.map((batch, index) => (
                    <div
                      key={batch.id}
                      onClick={() => handleSelectBatch(batch)}
                      className={`px-4 py-3 cursor-pointer border-b text-xs flex flex-col gap-1 transition-colors ${
                        selectedIndex === index
                          ? "bg-blue-600 text-white"
                          : "hover:bg-blue-50 text-gray-900 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between font-bold text-sm">
                        <span>{batch.product?.name}</span>
                        <span
                          className={
                            selectedIndex === index
                              ? "text-blue-100"
                              : "text-gray-400"
                          }
                        >
                          {batch.product?.barcode || batch.product?.material_code}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] opacity-80 font-semibold italic">
                        <span>
                          Exp: {batch.expiry_date} | Avail: {batch.qty} Units
                        </span>
                        <span>
                          Retail: Rs.{batch.retail_price} | Net: Rs.
                          {batch.netprice}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-4 py-4 text-center">Pack Details</th>
                    <th className="px-4 py-4 text-center">WH Price</th>
                    <th className="px-4 py-4 text-center">Total Units</th>
                    <th className="px-4 py-4 text-right">Total Value</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">
                          {item.batch_stock?.product?.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.batch_stock?.product?.barcode || item.batch_stock?.product?.material_code}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-600">
                        {Math.floor(
                          item.qty / (item.batch_stock?.pack_size || 1),
                        )}{" "}
                        x {item.batch_stock?.pack_size} +{" "}
                        {item.qty % (item.batch_stock?.pack_size || 1)}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-gray-700">
                        {item.wh_price
                          ? `Rs. ${Number(item.wh_price).toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-blue-700">
                        {item.qty + (item.free_qty || 0)}
                        {item.free_qty > 0 && (
                          <span className="text-[10px] text-green-500 block">
                            ({item.free_qty} Free)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-gray-900">
                        {item.wh_price
                          ? `Rs. ${(Number(item.wh_price) * Number(item.qty)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "-"}
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
                  BARCODE: {activeProduct.barcode || activeProduct.material_code}
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
                      {selectedBatch.expiry_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Avail. Units
                    </p>
                    <p className="font-black text-blue-600">
                      {selectedBatch.qty}
                    </p>
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
                        Exp: {b.expiry_date} | Avail: {b.qty} units
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedBatch && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Pack Size
                    </p>
                    <p className="font-bold text-blue-900">
                      {selectedBatch.pack_size} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Available Stock
                    </p>
                    <p className="font-bold text-blue-900">
                      {selectedBatch.qty} units
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Batch Cost (Net)
                    </p>
                    <p className="font-bold text-blue-900">
                      Rs. {Number(selectedBatch.netprice || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                      Batch Retail
                    </p>
                    <p className="font-bold text-blue-900">
                      Rs. {Number(selectedBatch.retail_price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
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
                <div className="space-y-1.5">
                  <label className="font-bold text-[10px] uppercase tracking-wider text-green-600 ml-0.5">
                    Free Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-lg bg-green-50/30 border border-green-100 outline-none font-bold text-sm focus:border-green-500 transition-colors"
                    value={itemForm.free_qty}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, free_qty: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-700 ml-0.5 flex justify-between items-center">
                    <span>Wholesale Price</span>
                    <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded italic">
                      Profit: Rs.{" "}
                      {Number(
                        Number(itemForm.wh_price || 0) -
                          Number(selectedBatch?.netprice || 0),
                      ).toFixed(2)}{" "}
                      / unit
                    </span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="Enter selling price to shop"
                    className="w-full px-4 py-4 rounded-xl bg-white border-2 border-blue-100 outline-none font-black text-xl text-blue-900 focus:border-blue-500 transition-all shadow-inner"
                    value={itemForm.wh_price}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, wh_price: e.target.value })
                    }
                  />
                  <div className="flex justify-between px-1">
                    <p className="text-[10px] font-bold text-gray-400">
                      MIN: Rs. {Number(selectedBatch?.netprice || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400">
                      MAX: Rs.{" "}
                      {Number(selectedBatch?.retail_price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">
                      Net Price (Cost)
                    </p>
                    <p className="font-bold text-gray-600">
                      Rs. {Number(selectedBatch?.netprice || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">
                      Retail Price
                    </p>
                    <p className="font-bold text-gray-600">
                      Rs. {Number(selectedBatch?.retail_price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBatch && (
                <div className="text-right border-t pt-2 border-gray-100">
                  <p className="text-xs font-bold text-gray-500">
                    Total To Add:{" "}
                    <span className="text-blue-600 text-lg">
                      {currentTotalQty} Units
                    </span>
                  </p>
                </div>
              )}

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
