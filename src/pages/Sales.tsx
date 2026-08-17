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
  Calendar,
  User as UserIcon,
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

  // Modal / Item Entry State
  const [activeBatch, setActiveBatch] = useState<BatchStock | null>(null);
  const [itemForm, setItemForm] = useState({
    no_cases: "",
    loose_qty: "0",
    unit_price: 0,
    discount_percentage: 5,
  });

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
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight text-left flex items-center gap-3">
            <span>Direct Sales Register</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Create and manage point of sale transactions.
          </p>
        </div>

        <button
          onClick={() => navigate("/pos")}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95"
        >
          <ShoppingCart size={20} />
          <span>Launch Fullscreen POS Terminal</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Sale Items Table & Form (Takes more space) */}
        <div className="flex-1 space-y-8 w-full">
          {/* Sale Settings Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Calendar size={16} className="text-blue-500" />
                Transaction Info
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-800"
                  value={saleData.date_time}
                  onChange={(e) =>
                    setSaleData({ ...saleData, date_time: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Payment Type
                </label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() =>
                      setSaleData({ ...saleData, payment_type: "cash" })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${saleData.payment_type === "cash" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Banknote size={16} /> Cash
                  </button>
                  <button
                    onClick={() =>
                      setSaleData({ ...saleData, payment_type: "card" })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${saleData.payment_type === "card" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <CreditCard size={16} /> Card
                  </button>
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Operator
                </label>
                <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2 text-blue-700">
                  <UserIcon size={16} />
                  <span className="font-bold">
                    {user?.name || "GUEST USER"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Search & Selection Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Search size={16} className="text-blue-500" />
                Add Products
              </h3>
            </div>
            <div className="p-6">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by Product Name, Code or Barcode..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {searchResults.map((batch, index) => (
                      <button
                        key={batch.id}
                        className={`w-full text-left px-6 py-4 flex items-center justify-between transition-all border-b border-gray-50 last:border-0 ${index === selectedIndex ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-800"}`}
                        onClick={() => handleSelectBatch(batch)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-lg ${index === selectedIndex ? "bg-white/20" : "bg-blue-50 text-blue-600"}`}
                          >
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-black text-sm">
                              {batch.product?.name}
                            </p>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-widest ${index === selectedIndex ? "text-white/70" : "text-gray-400"}`}
                            >
                              Code: {batch.product?.material_code} | Exp:{" "}
                              {batch.expiry_date || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end mb-1">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                              Pricing
                            </span>
                            <div className="flex gap-4 text-xs font-black">
                              <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                NET: Rs.{" "}
                                {(batch.netprice || 0).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                              <span className="text-gray-900 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                                RET: Rs.{" "}
                                {(batch.retail_price || 0).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                          <p
                            className={`text-[10px] font-bold px-3 py-1 rounded-lg border ${
                              index === selectedIndex
                                ? "bg-white/20 border-white/30 text-white"
                                : "bg-emerald-50 border-emerald-100 text-emerald-600"
                            }`}
                          >
                            STOCK: {batch.remain_qty}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced entry form area for active product (Case/Loose version like Loading.tsx) */}
              {activeBatch && (
                <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Package size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900">
                          {activeBatch.product?.name}
                        </h4>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            Batch: {activeBatch.id} | EXP:{" "}
                            {activeBatch.expiry_date || "N/A"}
                          </p>
                          <div className="flex items-center gap-6 bg-white/50 px-4 py-2 rounded-2xl border border-blue-100/50 w-fit">
                            <div className="flex flex-col">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                Available Stock
                              </p>
                              <p className="text-[14px] font-black text-emerald-600">
                                {activeBatch.remain_qty}{" "}
                                <span className="text-[10px] uppercase opacity-60">
                                  Units
                                </span>
                              </p>
                            </div>

                            <div className="h-8 w-px bg-gray-200"></div>

                            <div className="flex items-center gap-6">
                              <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">
                                  Net Price
                                </p>
                                <p className="text-[14px] font-black text-blue-600">
                                  Rs.{" "}
                                  {(activeBatch.netprice || 0).toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </p>
                              </div>

                              <div className="flex flex-col">
                                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none mb-1">
                                  Retail Price
                                </p>
                                <p className="text-[14px] font-black text-gray-900">
                                  Rs.{" "}
                                  {(
                                    activeBatch.retail_price || 0
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveBatch(null)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                        Cases (Pack: {activeBatch.pack_size})
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-gray-800"
                        value={itemForm.no_cases}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, no_cases: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                        Loose Units
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-gray-800"
                        value={itemForm.loose_qty}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            loose_qty: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                        Discount (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-blue-600"
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
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-blue-400 text-xs">
                          %
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">
                        Unit Price (Rs)
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl bg-white border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 font-black text-gray-800"
                        value={itemForm.unit_price}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          // percentage = (1 - discounted / original) * 100
                          const perc =
                            (1 - val / (activeBatch.retail_price || 1)) * 100;
                          setItemForm({
                            ...itemForm,
                            unit_price: val,
                            discount_percentage: Number(perc.toFixed(2)),
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center border-t border-blue-100 pt-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Total Selection
                      </p>
                      <p className="text-xl font-black text-blue-600">
                        {currentTotalQty}{" "}
                        <span className="text-xs text-gray-400">UNITS</span>
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActiveBatch(null)}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addItemToSale}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-3 font-bold"
                      >
                        <Plus size={20} /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <ShoppingCart size={16} className="text-blue-500" />
                Cart Items ({saleItems.length})
              </h3>
            </div>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Description
                    </th>
                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Qty (Units)
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Packaging
                    </th>
                    <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Price (Retail)
                    </th>
                    <th className="px-4 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Discount
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Subtotal
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {saleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-10">
                          <ShoppingCart size={80} strokeWidth={1.5} />
                          <p className="text-2xl font-black uppercase tracking-[0.2em]">
                            Cart Empty
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    saleItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">
                            {item.product_name}
                          </p>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter mt-0.5">
                            BATCH #{item.batch_id}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center font-black text-gray-700">
                          {item.qty}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-gray-500">
                            {Math.floor(item.qty / (item.pack_size || 1))} Cases
                            {item.qty % (item.pack_size || 1) > 0 &&
                              ` + ${item.qty % (item.pack_size || 1)} Loose`}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                          Rs.{" "}
                          {item.retail_price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-4 text-right font-bold text-red-500 text-xs whitespace-nowrap">
                          - Rs.{" "}
                          {item.discount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-blue-600 text-xs whitespace-nowrap">
                          Rs.{" "}
                          {item.total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
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

        {/* Right Sidebar: Checkout Summary (Matches Loading.tsx summary layout) */}
        <div className="w-full lg:w-[350px] lg:sticky lg:top-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Checkout
              </h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                Sale Summary
              </p>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">
                    Subtotal
                  </span>
                  <span className="font-black text-gray-900">
                    Rs.{" "}
                    {saleItems
                      .reduce(
                        (sum, item) => sum + item.qty * item.unit_price,
                        0,
                      )
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>

                <div className="flex justify-between items-center px-4 py-2 border-t border-gray-100 pt-4">
                  <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">
                    Total Savings
                  </span>
                  <span className="font-black text-emerald-500">
                    Rs.{" "}
                    {saleItems
                      .reduce((sum, item) => sum + item.discount, 0)
                      .toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>
              </div>

              <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">
                  Grand Total
                </p>
                <p className="text-4xl font-black tracking-tighter break-words">
                  Rs.{" "}
                  {calculateGrandTotal().toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="pt-4 space-y-4">
                <button
                  disabled={saleItems.length === 0 || loading}
                  onClick={handleCompleteSale}
                  className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50 group active:scale-95"
                >
                  {loading ? "Processing..." : "Confirm Sale"}
                  {!loading && (
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Help Card (Optional, for aesthetic) */}
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
            <div className="flex gap-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl h-fit">
                <AlertCircle size={20} />
              </div>
              <div>
                <h5 className="font-black text-gray-900 text-sm mb-1">
                  Stock Impact
                </h5>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Finalizing this sale will immediately deduct quantities from
                  the selected batches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal (Now only shown if print was successful/closed, or kept as a fallback for manual re-print) */}
      {completedSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-md no-print">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full p-10 animate-in fade-in zoom-in duration-300 border border-blue-100">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-inner">
              <CheckCircle2 size={48} />
            </div>

            <div className="text-center space-y-2 mb-10">
              <h3 className="text-3xl font-black text-gray-900">
                Sale Completed!
              </h3>
              <p className="text-gray-500 font-medium">
                Invoice{" "}
                <span className="text-blue-600 font-black">
                  S-{completedSale.id.toString().padStart(6, "0")}
                </span>{" "}
                has been generated successfully.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handlePrint}
                className="col-span-2 py-5 bg-gray-900 text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95"
              >
                <Printer size={20} />
                Print Sales Invoice
              </button>

              <button
                onClick={resetSale}
                className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-100 transition-all active:scale-95"
              >
                <Plus size={18} />
                New Sale
              </button>

              <button
                onClick={() => navigate("/supply-invoices?tab=sales")}
                className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                <History size={18} />
                View History
              </button>
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
