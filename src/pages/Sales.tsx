import { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  AlertCircle,
  Package,
  ArrowRight,
  CreditCard,
  Banknote,
  X,
  Pencil,
  Printer,
  History,
  CheckCircle2,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  category: string;
}

interface BatchStock {
  id: number;
  remain_qty: number;
  retail_price: number;
  netprice: number;
  free_qty: number;
  expiry_date: string;
  pack_size: number;
  product?: Product;
}

interface SaleItem {
  id: number;
  batch_id: number;
  product_id: number;
  qty: number;
  unit_price: number;
  total: number;
  discount: number;
  product_name?: string;
  pack_size?: number;
  retail_price: number;
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

const Sales = () => {
  const navigate = useNavigate();
  const { refreshTotalValue } = useWarehouse();
  const { user } = useAuth();

  // Navigation & UI State
  const [loading, setLoading] = useState(false);

  const getLocalToday = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [saleData, setSaleData] = useState({
    date_time: getLocalToday(),
    payment_type: "cash" as "cash" | "card",
  });

  // Items State
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [allBatches, setAllBatches] = useState<BatchStock[]>([]);
  const [searchResults, setSearchResults] = useState<BatchStock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form Refs
  const casesRef = useRef<HTMLInputElement>(null);
  const looseRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const unitPriceRef = useRef<HTMLInputElement>(null);

  // Modal / Item Entry State
  const [activeBatch, setActiveBatch] = useState<BatchStock | null>(null);
  const [itemForm, setItemForm] = useState({
    no_cases: "",
    loose_qty: "0",
    unit_price: 0,
    discount_percentage: 5,
  });

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldIndex: number) => {
    const refs = [casesRef, looseRef, discountRef, unitPriceRef];
    
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      refs[(fieldIndex + 1) % refs.length].current?.focus();
      refs[(fieldIndex + 1) % refs.length].current?.select();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      refs[(fieldIndex - 1 + refs.length) % refs.length].current?.focus();
      refs[(fieldIndex - 1 + refs.length) % refs.length].current?.select();
    } else if (e.key === "Enter") {
      e.preventDefault();
      addItemToSale();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setActiveBatch(null);
      searchInputRef.current?.focus();
    }
  };

  // Calculate totals for active selection
  const currentTotalQty =
    Number(itemForm.no_cases) * (activeBatch?.pack_size || 0) +
    Number(itemForm.loose_qty);

  // Fetch Initial Data
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/batch-stocks`,
        );
        setAllBatches(res.data);
      } catch (err) {
        console.error("Error fetching batches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const filtered = allBatches.filter((b) => {
      const p = b.product;
      if (!p) return false;
      if (b.remain_qty <= 0) return false;

      return (
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode &&
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Sort by Expiry Date (FEFO) and then by ID (FIFO) to prioritize oldest stock
    const sorted = filtered.sort((a, b) => {
      if (a.expiry_date && b.expiry_date) {
        const dateA = new Date(a.expiry_date).getTime();
        const dateB = new Date(b.expiry_date).getTime();
        if (dateA !== dateB) return dateA - dateB;
      } else if (a.expiry_date) {
        return -1; // Has expiry, should come first
      } else if (b.expiry_date) {
        return 1; // Has expiry, should come first
      }
      return a.id - b.id; // Otherwise, oldest ID first
    });

    setSearchResults(sorted);
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
    setActiveBatch(batch);
    setItemForm({
      no_cases: "",
      loose_qty: "1",
      unit_price: (batch.retail_price || 0) * 0.95, // Default 5% discount
      discount_percentage: 5,
    });
    setSearchTerm("");
    setSearchResults([]);
    setTimeout(() => {
      looseRef.current?.focus();
      looseRef.current?.select();
    }, 100);
  };

  const addItemToSale = () => {
    if (!activeBatch || currentTotalQty <= 0) return;

    if (currentTotalQty > activeBatch.remain_qty) {
      alert(
        `Insufficient stock! Total Available: ${activeBatch.remain_qty}, Requested: ${currentTotalQty}`,
      );
      return;
    }

    const total = currentTotalQty * itemForm.unit_price;
    const totalDiscount = activeBatch.retail_price * currentTotalQty - total;

    const newItem: SaleItem = {
      id: Date.now(),
      batch_id: activeBatch.id,
      product_id: activeBatch.product!.id,
      qty: currentTotalQty,
      unit_price: itemForm.unit_price,
      total,
      discount: totalDiscount,
      product_name: activeBatch.product!.name,
      pack_size: activeBatch.pack_size,
      retail_price: activeBatch.retail_price,
    };

    setSaleItems([...saleItems, newItem]);
    setActiveBatch(null);
    searchInputRef.current?.focus();
  };

  const removeItem = (id: number) => {
    setSaleItems(saleItems.filter((item) => item.id !== id));
  };

  const handleEditItem = (item: SaleItem) => {
    // 1. Find the batch
    const batch = allBatches.find((b) => b.id === item.batch_id);
    if (!batch) return;

    // 2. Map item data to form
    const cases = Math.floor(item.qty / (item.pack_size || 1));
    const loose = item.qty % (item.pack_size || 1);
    const discPerc = (1 - item.unit_price / (batch.retail_price || 1)) * 100;

    setActiveBatch(batch);
    setItemForm({
      no_cases: cases > 0 ? cases.toString() : "",
      loose_qty: loose.toString(),
      unit_price: item.unit_price,
      discount_percentage: Number(discPerc.toFixed(2)),
    });

    // 3. Remove from cart (to be replaced on re-save)
    setSaleItems(saleItems.filter((i) => i.id !== item.id));

    // 4. Scroll up to the form
    window.scrollTo({ top: 300, behavior: "smooth" });

    // 5. Focus the input
    setTimeout(() => {
      looseRef.current?.focus();
      looseRef.current?.select();
    }, 100);
  };

  const calculateGrandTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleCompleteSale = async () => {
    if (saleItems.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date_time: saleData.date_time.replace("T", " ") + ":00",
        user_id: user?.id,
        total: calculateGrandTotal(),
        status: "completed",
        discount: saleItems.reduce((sum, item) => sum + item.discount, 0),
        payment_type: saleData.payment_type,
        items: saleItems.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: item.qty,
          retail_price: item.retail_price,
          unit_price: item.unit_price,
          total: item.total,
          discount: item.discount,
        })),
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/sales`,
        payload,
      );
      await refreshTotalValue();

      // Directly set the completed sale and trigger print
      setCompletedSale(response.data.sale);

      // Give a tiny bit of time for the printable area to render
      setTimeout(() => {
        window.print();
        // Option to reset after print if desired (uncomment if you want it to clear automatically)
        // resetSale();
      }, 300);
    } catch (err: any) {
      console.error("Error saving sale:", err);
      alert(err.response?.data?.message || "Failed to save sale.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetSale = () => {
    setSaleItems([]);
    setCompletedSale(null);
    setSaleData({
      date_time: getLocalToday(),
      payment_type: "cash",
    });
    setSearchTerm("");
  };  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Area with Direct Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-stone-200 rounded-lg p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Direct Sales Register
            </h1>
            <span className="bg-stone-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded border border-stone-200">
              Counter Sales
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, process, and record point of sale transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/supply-invoices?tab=sales")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 rounded-md text-xs font-semibold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          >
            <History size={14} className="text-slate-500" />
            <span>Sales History</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-md text-xs font-semibold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          >
            <ShoppingCart size={14} />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout: 2 Columns */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Section: Transaction Info, Product Search, and Cart Table */}
        <div className="flex-1 space-y-6 w-full">
          {/* Compact Transaction Info Bar */}
          <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                  value={saleData.date_time}
                  onChange={(e) =>
                    setSaleData({ ...saleData, date_time: e.target.value })
                  }
                />
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="flex gap-1.5 p-1 bg-stone-100 rounded-md border border-stone-200">
                  <button
                    type="button"
                    onClick={() =>
                      setSaleData({ ...saleData, payment_type: "cash" })
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 ${
                      saleData.payment_type === "cash"
                        ? "bg-teal-800 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Banknote size={14} /> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSaleData({ ...saleData, payment_type: "card" })
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 ${
                      saleData.payment_type === "card"
                        ? "bg-teal-800 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard size={14} /> Card
                  </button>
                </div>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cashier / Operator
                </label>
                <div className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-md flex items-center gap-2 text-slate-800">
                  <div className="w-5 h-5 rounded bg-teal-800 text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="text-xs font-semibold truncate">
                    {user?.name || "Administrator"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Search & Selection Section */}
          <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-xs relative">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="admin-search-products"
                className="text-xs font-bold text-slate-800 uppercase tracking-wider"
              >
                Scan barcode or search products
              </label>
              <span className="text-xs text-slate-500 font-medium">
                {allBatches.length} batches in catalog
              </span>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                id="admin-search-products"
                ref={searchInputRef}
                type="text"
                placeholder="Search by product name, barcode, or SKU..."
                className="w-full pl-10 pr-10 py-2.5 bg-stone-50 text-slate-900 rounded-lg border border-stone-300 placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={15} />
                </button>
              )}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-lg shadow-lg border border-stone-200 overflow-hidden max-h-80 overflow-y-auto">
                  {searchResults.map((batch, index) => (
                    <button
                      key={batch.id}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors border-b border-stone-100 last:border-0 ${
                        index === selectedIndex
                          ? "bg-teal-800 text-white"
                          : "hover:bg-stone-50 text-slate-900"
                      }`}
                      onClick={() => handleSelectBatch(batch)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded ${
                            index === selectedIndex ? "bg-white/20" : "bg-stone-100 text-slate-600"
                          }`}
                        >
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-xs">
                            {batch.product?.name}
                          </p>
                          <p
                            className={`text-[11px] font-mono ${
                              index === selectedIndex ? "text-teal-100" : "text-slate-500"
                            }`}
                          >
                            SKU: {batch.product?.material_code} · Batch #{batch.id} · Exp: {batch.expiry_date || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end text-xs font-mono tabular-nums">
                          <span className={index === selectedIndex ? "text-white" : "text-slate-900 font-bold"}>
                            {formatCurrency(Number(batch.retail_price))}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${
                            index === selectedIndex ? "text-teal-100" : "text-teal-800"
                          }`}
                        >
                          {formatPackaging(batch.remain_qty, batch.pack_size)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Batch Item Configuration Panel */}
            {activeBatch && (
              <div className="mt-4 p-4 bg-stone-50 border border-teal-700/30 rounded-lg animate-in fade-in duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-teal-800 text-white mt-0.5">
                      <Package size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {activeBatch.product?.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Batch #{activeBatch.id} · SKU: {activeBatch.product?.material_code} · Exp: {activeBatch.expiry_date || "N/A"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                          Available: {formatPackaging(activeBatch.remain_qty, activeBatch.pack_size)}
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-stone-200 rounded font-mono font-semibold text-slate-700">
                          Retail: {formatCurrency(Number(activeBatch.retail_price))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveBatch(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label="Cancel product selection"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cases (Pack: {activeBatch.pack_size})
                    </label>
                    <input
                      id="cases-input"
                      ref={casesRef}
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      value={itemForm.no_cases}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, no_cases: e.target.value })
                      }
                      onKeyDown={(e) => handleFormKeyDown(e, 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loose Units
                    </label>
                    <input
                      id="loose-input"
                      ref={looseRef}
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      value={itemForm.loose_qty}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          loose_qty: e.target.value,
                        })
                      }
                      onKeyDown={(e) => handleFormKeyDown(e, 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Discount (%)
                    </label>
                    <input
                      id="discount-input"
                      ref={discountRef}
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                      value={itemForm.discount_percentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const unitP =
                          activeBatch.retail_price * (1 - val / 100);
                        setItemForm({
                          ...itemForm,
                          discount_percentage: val,
                          unit_price: Number(unitP.toFixed(2)),
                        });
                      }}
                      onKeyDown={(e) => handleFormKeyDown(e, 2)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unit Price (LKR)
                    </label>
                    <input
                      id="price-input"
                      ref={unitPriceRef}
                      type="number"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 font-mono"
                      value={itemForm.unit_price}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const perc =
                          (1 - val / (activeBatch.retail_price || 1)) * 100;
                        setItemForm({
                          ...itemForm,
                          unit_price: val,
                          discount_percentage: Number(perc.toFixed(2)),
                        });
                      }}
                      onKeyDown={(e) => handleFormKeyDown(e, 3)}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-slate-500 font-medium">Selected Quantity: </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatPackaging(currentTotalQty, activeBatch.pack_size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveBatch(null)}
                      className="px-3.5 py-1.5 bg-white border border-stone-300 text-slate-700 hover:bg-stone-50 rounded-md text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addItemToSale}
                      className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus size={15} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart size={15} className="text-teal-800" />
                <span>Cart Items ({saleItems.length})</span>
              </h3>
              {saleItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSaleItems([])}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Clear Cart
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-slate-500 border-b border-stone-200 font-semibold">
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty (Units)</th>
                    <th className="py-2.5 px-3">Packaging</th>
                    <th className="py-2.5 px-3 text-right">Retail Price</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                    <th className="py-2.5 px-4 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {saleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <ShoppingCart size={32} className="mx-auto mb-2 text-stone-300" />
                        <p className="text-xs font-semibold text-slate-700">No Items Added to Sale</p>
                        <p className="text-[11px] text-slate-500 mt-1">Search or scan a product above to add items to this transaction.</p>
                      </td>
                    </tr>
                  ) : (
                    saleItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 text-xs">
                            {item.product_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Batch #{item.batch_id}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {item.qty}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {formatPackaging(item.qty, item.pack_size)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                          {formatCurrency(item.retail_price)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">
                          - {formatCurrency(item.discount)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono tabular-nums">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="p-1 text-slate-400 hover:text-teal-800 rounded transition-colors"
                              title="Edit line"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Checkout Summary Panel */}
        <div className="w-full lg:w-[350px] lg:sticky lg:top-20 space-y-4 shrink-0">
          <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-xs">
            <div className="border-b border-stone-200 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Sale Checkout</h3>
              <p className="text-xs text-slate-500">Summary and transaction confirmation</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal ({saleItems.length} lines)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {formatCurrency(
                    saleItems.reduce(
                      (sum, item) => sum + item.qty * item.unit_price,
                      0
                    )
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Total Savings</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  - {formatCurrency(
                    saleItems.reduce((sum, item) => sum + item.discount, 0)
                  )}
                </span>
              </div>

              {/* Grand Total Highlight Box */}
              <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                  {formatCurrency(calculateGrandTotal())}
                </span>
              </div>

              {/* Confirm Sale Button */}
              <button
                type="button"
                disabled={saleItems.length === 0 || loading}
                onClick={() => {
                  if (loading) return;
                  handleCompleteSale();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.repeat) {
                    e.preventDefault();
                  }
                }}
                className="w-full mt-4 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-md font-bold text-sm shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-700/50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Sale</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Supporting Stock Impact Note */}
              <div className="pt-2 text-[11px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
                <AlertCircle size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Stock impact: Quantities will be deducted immediately from warehouse inventory upon confirmation.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 size={28} />
            </div>

            <div className="text-center space-y-1 mb-6">
              <h3 className="text-base font-bold text-slate-900">
                Sale Completed Successfully
              </h3>
              <p className="text-xs text-slate-500">
                Invoice <span className="font-mono font-bold text-teal-800">S-{completedSale.id.toString().padStart(6, "0")}</span> has been recorded.
              </p>
              <p className="text-base font-bold text-slate-900 font-mono mt-2">
                {formatCurrency(Number(completedSale.total))}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-md font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Printer size={15} />
                <span>Print Sales Invoice (80mm)</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetSale}
                  className="py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>New Sale</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/supply-invoices?tab=sales")}
                  className="py-2 bg-white hover:bg-stone-50 border border-stone-300 text-slate-700 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <History size={14} />
                  <span>View History</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE (Hidden from Screen) */}
      <div id="printable-invoice" className="hidden-print">
        {completedSale && (
          <div className="pos-bill mx-auto text-black bg-white font-mono p-4 w-[80mm] min-h-screen">
            {/* Store Header */}
            <div className="text-center mb-4 space-y-1">
              <h1 className="text-2xl font-black text-blue-700 uppercase leading-none">
                Thejani Traders
              </h1>
              <p className="text-[11px] font-bold">Chilaw</p>
              <p className="text-[11px] font-bold">Sri Lanka</p>
              <p className="text-[11px] font-bold">+94 77 123 4567</p>
              <p className="text-[11px] font-bold border-b border-black pb-2">
                info@thejanitraders.lk / www.thejanitraders.lk
              </p>
            </div>

            {/* Bill Info */}
            <div className="text-[10px] space-y-1 mb-4 border-b border-black pb-2">
              <div className="flex justify-between">
                <span className="font-bold">Invoice No:</span>
                <span className="font-black uppercase tracking-tighter">
                  INV
                  {(() => {
                    const d = new Date(completedSale.date_time);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    return `${y}${m}${day}`;
                  })()}
                  {completedSale.id.toString().padStart(4, "0")}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold uppercase">Admin / MAIN / L-1</span>
                <span className="font-bold">
                  {new Date().toLocaleDateString()}{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            </div>

            {/* Banner */}
            <div className="text-center border-b-2 border-black py-2 mb-2">
              <h2 className="text-base font-black uppercase text-blue-700 tracking-[0.2em]">
                Invoice Items
              </h2>
            </div>

            {/* Items Table */}
            <div className="text-[10px] mb-4">
              <div className="flex font-black uppercase border-b border-black pb-1 mb-1">
                <span className="flex-1">Product Name</span>
              </div>
              <div className="flex font-black uppercase border-b border-black pb-1 mb-2">
                <span className="w-[25%] text-left">PRICE</span>
                <span className="w-[25%] text-center">QTY</span>
                <span className="w-[25%] text-right">DIS.</span>
                <span className="w-[25%] text-right">SUBTOTAL</span>
              </div>

              <div className="space-y-3">
                {completedSale.items.map((item: any, index: number) => (
                  <div
                    key={item.id}
                    className="border-b border-dotted border-gray-300 pb-2"
                  >
                    <div className="font-bold">
                      {(index + 1).toString().padStart(2, "0")}.{" "}
                      {item.product?.name || "Product Name"}
                    </div>
                    <div className="flex">
                      <span className="w-[25%] text-left">
                        {Number(item.retail_price).toFixed(2)}
                      </span>
                      <span className="w-[25%] text-center">
                        {Number(item.qty).toFixed(3)}
                      </span>
                      <span className="w-[25%] text-right">
                        {Number(item.discount).toFixed(2)}
                      </span>
                      <span className="w-[25%] text-right font-black">
                        {Number(item.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="text-[12px] space-y-2 border-t-2 border-black pt-2 mb-4">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="font-black">
                  {(
                    Number(completedSale.total) +
                    Number(completedSale.discount || 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Discount:</span>
                <span>{Number(completedSale.discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-2 border-t border-black">
                <span>GRAND TOTAL:</span>
                <span>{Number(completedSale.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Details */}
            <div className="text-[11px] font-bold border-t border-black pt-2 space-y-1">
              <div className="flex justify-between uppercase">
                <span>Sale Type:</span>
                <span className="font-black">{completedSale.payment_type}</span>
              </div>
              <div className="flex justify-between uppercase">
                <span>Total Items:</span>
                <span className="font-black">
                  {completedSale.items.length.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-[12px] font-black uppercase text-gray-800">
                Thank You! Come Again!
              </p>
              <p className="text-[8px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                System by Thejani Traders
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 0;
            margin: 0;
          }
          .pos-bill {
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .hidden-print {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Sales;
