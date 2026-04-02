
import { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  material_code: string;
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
  const [products, setProducts] = useState<Product[]>([]);

  // Loading Header State
  const [loadingData, setLoadingData] = useState({
    id: null as number | null,
    load_number: "",
    truck_id: "",
    route_id: "",
    prepared_date: new Date().toISOString().split("T")[0],
    loading_date: new Date().toISOString().split("T")[0],
    status: "pending",
  });

  // Items State
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal / Item Entry State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<BatchStock[]>([]);
  const [itemForm, setItemForm] = useState({
    batch_id: "",
    no_cases: "",
    free_qty: "0",
    wh_price: "",
    net_price: "",
  });

  // Calculate totals for selected batch in modal
  const selectedBatch = productBatches.find(b => b.id.toString() === itemForm.batch_id);
  const currentPackSize = selectedBatch?.pack_size || 0;
  const currentTotalQty = (Number(itemForm.no_cases) * currentPackSize) + Number(itemForm.free_qty || 0);

  // Auto-focus logic
  useEffect(() => {
    if (step === 'items' && !activeProduct && !showConfirmSave && !showConfirmCancel) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, activeProduct, showConfirmSave, showConfirmCancel]);

  // Fetch Initial Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [trucksRes, routesRes, productsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/trucks`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/routes`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`)
        ]);
        setTrucks(trucksRes.data);
        setRoutes(routesRes.data);
        setProducts(productsRes.data);
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

    const directMatch = products.find(
      (p) => p.material_code.toLowerCase() === searchTerm.toLowerCase()
    );

    if (directMatch) {
      handleSelectProduct(directMatch);
      return;
    }

    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(filtered);
  }, [searchTerm, products]);

  const handleSelectProduct = async (product: Product) => {
    setLoading(true);
    try {
      // Fetch all batches and filter client-side since the custom route might not be deployed
      // Use standard VITE_API_BASE_URL as it works for other endpoints like /products
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks`);

      const allBatches = res.data;
      // Filter for this product and ensure stock > 0
      const filteredBatches = allBatches.filter((b: any) =>
        (b.product_id === product.id || (b.product && b.product.id === product.id)) && b.qty > 0
      );

      setProductBatches(filteredBatches);
      setActiveProduct(product);
      setSearchTerm("");
      setSearchResults([]);
      setItemForm({ batch_id: "", no_cases: "", free_qty: "0", wh_price: "", net_price: "" });
    } catch (err) {
      console.error("Error fetching batches:", err);
      alert("Failed to fetch batches for this product.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoading = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        load_number: loadingData.load_number,
        truck_id: loadingData.truck_id,
        route_id: loadingData.route_id,
        prepared_date: loadingData.prepared_date,
        loading_date: loadingData.loading_date,
        status: loadingData.status
      };

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/loadings`, payload);
      setLoadingData({ ...loadingData, id: res.data.id });
      setStep("items");
    } catch (err: any) {
      console.error("Error creating loading:", err);
      if (err.response && err.response.status === 422) {
        const errors = err.response.data.errors;
        const errorMessages = Object.keys(errors).map(key => errors[key][0]).join('\n');
        alert(`Validation Failed:\n${errorMessages}`);
      } else {
        alert(err.response?.data?.message || "Failed to create loading. Check connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadingData.id || !selectedBatch) return;

    if (currentTotalQty > selectedBatch.qty) {
      alert(`Insufficient stock! Available: ${selectedBatch.qty}, Requested: ${currentTotalQty}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        loading_id: loadingData.id,
        batch_id: selectedBatch.id,
        qty: Number(itemForm.no_cases) * currentPackSize,
        free_qty: Number(itemForm.free_qty || 0),
        wh_price: Number(itemForm.wh_price || 0),
        net_price: Number(itemForm.net_price || 0),
      };

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/loading-items`, payload);

      // Update local items list with the returned item
      // We need to attach the batch details for display since the API returns the item with relations
      // The API returns item->load(['batchStock.product'])
      setLoadingItems([...loadingItems, res.data]);

      setActiveProduct(null);
    } catch (err: any) {
      console.error("Error adding item:", err);
      // alert(err.response?.data?.message || "Failed to add item.");
      // Show error properly
      const msg = err.response?.data?.message || JSON.stringify(err.response?.data?.errors) || "Failed to add item";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (id: number) => {
    if (!confirm("Are you sure you want to remove this item? Stock will be restored.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/loading-items/${id}`);
      setLoadingItems(loadingItems.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error removing item:", err);
      alert("Failed to remove item.");
    }
  };

  const handleComplete = async () => {
    await refreshTotalValue();
    navigate("/supply-invoices", { state: { activeTab: 'loading' } });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">New Loading Sheet</h1>
            <p className="text-sm text-gray-500">Create loading manifest and assign stock</p>
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
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">Loading Details</h2>
            </div>

            <form onSubmit={handleCreateLoading} className="p-6 space-y-5">
              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Load Number</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={loadingData.load_number}
                    onChange={(e) => setLoadingData({ ...loadingData, load_number: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Truck</label>
                    <select
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      value={loadingData.truck_id}
                      onChange={(e) => setLoadingData({ ...loadingData, truck_id: e.target.value })}
                    >
                      <option value="">Select Truck</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>{t.licence_plate_no} - {t.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Route</label>
                    <select
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      value={loadingData.route_id}
                      onChange={(e) => setLoadingData({ ...loadingData, route_id: e.target.value })}
                    >
                      <option value="">Select Route</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.route_code} - {r.route_description}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Prepared Date</label>
                    <input
                      type="date" required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      value={loadingData.prepared_date}
                      onChange={(e) => setLoadingData({ ...loadingData, prepared_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Loading Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      value={loadingData.loading_date}
                      onChange={(e) => setLoadingData({ ...loadingData, loading_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Loading Sheet"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Info Card */}
            <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Load No</p>
                  <p className="font-black text-gray-800 text-lg">#{loadingData.load_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Route</p>
                  <p className="font-bold text-gray-800 text-sm">
                    {routes.find(r => r.id.toString() === loadingData.route_id)?.route_code || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Truck</p>
                  <p className="font-bold text-gray-800 text-sm">
                    {trucks.find(t => t.id.toString() === loadingData.truck_id)?.licence_plate_no || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total Items</p>
                <p className="text-xl font-black text-blue-600">{loadingItems.length}</p>
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
              />
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto z-10 relative">
                  {searchResults.map((p) => (
                    <div key={p.id} onClick={() => handleSelectProduct(p)} className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b text-xs flex justify-between font-bold">
                      <span>{p.name}</span>
                      <span className="text-gray-400 font-mono">{p.material_code}</span>
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
                    <th className="px-4 py-4 text-center">Batch</th>
                    <th className="px-4 py-4 text-center">Cases</th>
                    <th className="px-4 py-4 text-center">Pack Info</th>
                    <th className="px-4 py-4 text-center">WH Price</th>
                    <th className="px-4 py-4 text-center">Total Units</th>
                    <th className="px-4 py-4 text-right">Total Value</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">{item.batch_stock?.product?.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.batch_stock?.product?.material_code}</p>
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-gray-500">#{item.batch_id}</td>
                      <td className="px-4 py-4 text-center font-bold">{Math.floor(item.qty / (item.batch_stock?.pack_size || 1))}</td>
                      <td className="px-4 py-4 text-center text-gray-500">1 x {item.batch_stock?.pack_size}</td>
                      <td className="px-4 py-4 text-center font-bold text-gray-700">
                        {item.wh_price ? `Rs. ${Number(item.wh_price).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-blue-700">
                        {item.qty + (item.free_qty || 0)}
                        {item.free_qty > 0 && <span className="text-[10px] text-green-500 block">({item.free_qty} Free)</span>}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-gray-900">
                        {item.wh_price ? `Rs. ${(Number(item.wh_price) * (Number(item.qty))).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loadingItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-30">
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
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Add Stock to Loading</p>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">{activeProduct.name}</h4>
                <p className="text-[10px] text-gray-400 font-mono mt-1">CODE: {activeProduct.material_code}</p>
              </div>
              <button onClick={() => setActiveProduct(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-5">
              <div className="space-y-1.5 contents">
                <label className="font-bold text-gray-600 ml-0.5">Select Batch</label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-medium text-sm"
                  value={itemForm.batch_id}
                  onChange={(e) => setItemForm({ ...itemForm, batch_id: e.target.value })}
                >
                  <option value="">-- Choose Batch --</option>
                  {productBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      Batch #{b.id} | Exp: {b.expiry_date} | Avail: {b.qty} units
                    </option>
                  ))}
                </select>
              </div>

              {selectedBatch && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Pack Size</p>
                    <p className="font-bold text-blue-900">{selectedBatch.pack_size} units</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Available Stock</p>
                    <p className="font-bold text-blue-900">{selectedBatch.qty} units</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">No. of Cases</label>
                  <input
                    type="number" required min="1" autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={itemForm.no_cases}
                    onChange={(e) => setItemForm({ ...itemForm, no_cases: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Free Qty (Units)</label>
                  <input
                    type="number" min="0"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={itemForm.free_qty}
                    onChange={(e) => setItemForm({ ...itemForm, free_qty: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">WH Price</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={itemForm.wh_price}
                    onChange={(e) => setItemForm({ ...itemForm, wh_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Net Price</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={itemForm.net_price}
                    onChange={(e) => setItemForm({ ...itemForm, net_price: e.target.value })}
                  />
                </div>
              </div>

              {selectedBatch && (
                <div className="text-right border-t pt-2 border-gray-100">
                  <p className="text-xs font-bold text-gray-500">Total To Add: <span className="text-blue-600 text-lg">{currentTotalQty} Units</span></p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setActiveProduct(null)} className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={!selectedBatch || loading} className="flex-[2] py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {loading ? "Adding..." : "Add to Manifest"}
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
            <h3 className="text-xl font-black text-gray-900 mb-2">Finalize Loading?</h3>
            <p className="text-sm text-gray-500 mb-8">This will save the loading manifest. Ensure all items are correct.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirmSave(false)} className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50">Back</button>
              <button onClick={handleComplete} className="py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-100">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">Exit Creation?</h3>
            <p className="text-sm text-gray-500 mb-8">The loading sheet has been created but not recommended to leave incomplete.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirmCancel(false)} className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50">Back</button>
              <button onClick={() => navigate("/supply-invoices", { state: { activeTab: 'loading' } })} className="py-3 font-bold text-white bg-red-500 rounded-xl shadow-lg shadow-red-100">Exit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Loading;
