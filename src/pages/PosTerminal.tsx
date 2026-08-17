import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Package,
  CreditCard,
  Banknote,
  Calendar,
  X,
  Printer,
  History,
  CheckCircle2,
  Barcode,
  ArrowLeft,
  RotateCcw,
  Receipt,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  category?: string;
}

interface BatchStock {
  id: number;
  remain_qty: number;
  returned_qty?: number;
  retail_price: number;
  netprice: number;
  free_qty?: number;
  expiry_date?: string;
  pack_size: number;
  product?: Product;
}

interface CartItem {
  cart_id: string; // Unique ID for cart row
  batch_id: number;
  product_id: number;
  product_name: string;
  material_code: string;
  barcode: string;
  pack_size: number;
  cases: number;
  units: number;
  total_qty: number;
  retail_price: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  available_qty: number;
}

const PosTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { refreshTotalValue } = useWarehouse();

  // Active cashier clock
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // POS State
  const [loading, setLoading] = useState(false);
  const [allBatches, setAllBatches] = useState<BatchStock[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchStock[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>(["All"]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "card">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  // Barcode search input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch Inventory Data
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/batch-stocks`
      );
      const batches: BatchStock[] = res.data.filter(
        (b: BatchStock) => b.remain_qty > 0 && b.product
      );
      setAllBatches(batches);
      setFilteredBatches(batches);

      // Extract unique categories
      const cats = Array.from(
        new Set(
          batches
            .map((b) => b.product?.category || "General")
            .filter(Boolean)
        )
      );
      setCategories(["All", ...cats]);
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Sales History
  const fetchHistory = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/sales`
      );
      setRecentSales(res.data);
    } catch (err) {
      console.error("Error fetching sales history:", err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchHistory();
  }, []);

  // Filter batches by search query & category
  useEffect(() => {
    let result = allBatches;

    if (selectedCategory !== "All") {
      result = result.filter(
        (b) => (b.product?.category || "General") === selectedCategory
      );
    }

    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.product?.name.toLowerCase().includes(query) ||
          b.product?.barcode?.toLowerCase().includes(query) ||
          b.product?.material_code?.toLowerCase().includes(query)
      );
    }

    // Sort by Expiry Date (FEFO) then ID (FIFO)
    result.sort((a, b) => {
      if (a.expiry_date && b.expiry_date) {
        return (
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
      }
      return a.id - b.id;
    });

    setFilteredBatches(result);
  }, [searchTerm, selectedCategory, allBatches]);

  // Keyboard shortcut listener (Ctrl+F to search, Esc to clear)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
        if (isHistoryOpen) setIsHistoryOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isCheckoutOpen, isHistoryOpen]);

  // Handle Barcode Scan / Exact Match Auto Add
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Check for exact barcode or material code match
    const exactMatch = filteredBatches.find(
      (b) =>
        b.product?.barcode === searchTerm.trim() ||
        b.product?.material_code === searchTerm.trim()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchTerm("");
    } else if (filteredBatches.length > 0) {
      addToCart(filteredBatches[0]);
      setSearchTerm("");
    }
  };

  // Add Item to Cart
  const addToCart = (batch: BatchStock) => {
    if (!batch.product) return;

    const existingIndex = cart.findIndex((item) => item.batch_id === batch.id);

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newQty = existing.total_qty + 1;
      if (newQty > batch.remain_qty) {
        alert(
          `Cannot add more! Total available stock is ${batch.remain_qty} units.`
        );
        return;
      }
      updateCartItemQty(existing.cart_id, newQty);
    } else {
      const unitPrice = batch.retail_price;
      const newCartItem: CartItem = {
        cart_id: `${batch.id}-${Date.now()}`,
        batch_id: batch.id,
        product_id: batch.product.id,
        product_name: batch.product.name,
        material_code: batch.product.material_code,
        barcode: batch.product.barcode,
        pack_size: batch.pack_size || 1,
        cases: 0,
        units: 1,
        total_qty: 1,
        retail_price: batch.retail_price,
        unit_price: unitPrice,
        discount_percentage: 0,
        discount_amount: 0,
        line_total: unitPrice,
        available_qty: batch.remain_qty,
      };
      setCart([...cart, newCartItem]);
    }
  };

  // Update Item Quantity in Cart
  const updateCartItemQty = (cartId: string, newTotalQty: number) => {
    if (newTotalQty <= 0) {
      removeFromCart(cartId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cart_id !== cartId) return item;

        if (newTotalQty > item.available_qty) {
          alert(
            `Max available stock reached! Only ${item.available_qty} units in batch.`
          );
          return item;
        }

        const cases = Math.floor(newTotalQty / item.pack_size);
        const units = newTotalQty % item.pack_size;

        const grossTotal = newTotalQty * item.retail_price;
        const discountAmt = (grossTotal * item.discount_percentage) / 100;
        const lineTotal = grossTotal - discountAmt;
        const unitPrice = newTotalQty > 0 ? lineTotal / newTotalQty : item.retail_price;

        return {
          ...item,
          cases,
          units,
          total_qty: newTotalQty,
          discount_amount: discountAmt,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      })
    );
  };

  // Update Item Discount Percentage
  const updateItemDiscount = (cartId: string, discPercent: number) => {
    const validDisc = Math.min(100, Math.max(0, discPercent));
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cart_id !== cartId) return item;
        const grossTotal = item.total_qty * item.retail_price;
        const discountAmt = (grossTotal * validDisc) / 100;
        const lineTotal = grossTotal - discountAmt;
        const unitPrice = lineTotal / item.total_qty;

        return {
          ...item,
          discount_percentage: validDisc,
          discount_amount: discountAmt,
          unit_price: unitPrice,
          line_total: lineTotal,
        };
      })
    );
  };

  // Remove Item from Cart
  const removeFromCart = (cartId: string) => {
    setCart(cart.filter((item) => item.cart_id !== cartId));
  };

  // Clear Entire Cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Are you sure you want to clear the cashier cart?")) {
      setCart([]);
      setCashTendered("");
      setOverallDiscount(0);
    }
  };

  // Calculations
  const grossSubtotal = cart.reduce(
    (sum, item) => sum + item.total_qty * item.retail_price,
    0
  );
  const totalItemDiscounts = cart.reduce(
    (sum, item) => sum + item.discount_amount,
    0
  );
  const netBeforeOverall = grossSubtotal - totalItemDiscounts;
  const grandTotal = Math.max(0, netBeforeOverall - overallDiscount);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.total_qty, 0);

  const cashAmountNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashAmountNum - grandTotal);

  // Complete Sale (Checkout)
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    if (paymentType === "cash" && cashAmountNum < grandTotal) {
      alert(`Insufficient cash tendered! Grand Total is LKR ${grandTotal.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const localIsoDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const payload = {
        date_time: localIsoDate,
        user_id: user?.id || 1,
        total: grandTotal,
        discount: totalItemDiscounts + overallDiscount,
        payment_type: paymentType,
        items: cart.map((item) => ({
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: item.total_qty,
          retail_price: item.retail_price,
          unit_price: item.unit_price,
          total: item.line_total,
          discount: item.discount_amount,
        })),
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/sales`,
        payload
      );

      await refreshTotalValue();
      await fetchInventory();
      await fetchHistory();

      const createdSale = response.data.sale || {
        id: response.data.id || Date.now(),
        date_time: localIsoDate,
        total: grandTotal,
        discount: totalItemDiscounts + overallDiscount,
        payment_type: paymentType,
        user: { name: user?.name || "Cashier" },
        items: cart.map((i) => ({
          product: { name: i.product_name },
          qty: i.total_qty,
          retail_price: i.retail_price,
          total: i.line_total,
        })),
      };

      setCompletedSale({
        ...createdSale,
        cashTendered: paymentType === "cash" ? cashAmountNum : grandTotal,
        changeDue: paymentType === "cash" ? changeDue : 0,
      });

      // Clear cart
      setCart([]);
      setCashTendered("");
      setOverallDiscount(0);
      setIsCheckoutOpen(false);

      // Trigger automatic print modal preview
      setTimeout(() => {
        window.print();
      }, 400);
    } catch (err: any) {
      console.error("Checkout Error:", err);
      const errMsg =
        err.response?.data?.message ||
        "Transaction failed! Please check stock levels.";
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Void Sale from History
  const handleVoidSale = async (saleId: number) => {
    if (
      !window.confirm(
        `Are you sure you want to void Sale #${saleId}? Stock will be restored to warehouse.`
      )
    )
      return;

    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/sales/${saleId}`);
      await refreshTotalValue();
      await fetchInventory();
      await fetchHistory();
      alert(`Sale #${saleId} voided successfully! Stock restored.`);
    } catch (err: any) {
      console.error("Void Error:", err);
      alert("Failed to void sale transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top POS Cashier Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          {user?.role === "cashier" ? (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="flex items-center gap-2 text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 px-3 py-1.5 rounded-xl border border-red-800/50 text-xs font-semibold transition-all"
            >
              <ArrowLeft size={16} />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/sales")}
              className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold transition-all"
            >
              <ArrowLeft size={16} />
              <span>Exit POS</span>
            </button>
          )}

          <div className="h-6 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                POS TERMINAL
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  ONLINE
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Thejani Traders Cashier Counter
              </p>
            </div>
          </div>
        </div>

        {/* Center Clock */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-xl border border-slate-800 font-mono text-xs text-blue-400 font-bold shadow-inner">
          <Calendar size={14} className="text-slate-500" />
          <span>{new Date().toLocaleDateString()}</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400">{currentTime}</span>
        </div>

        {/* Cashier Info & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all shadow-sm"
          >
            <History size={16} className="text-blue-400" />
            <span className="hidden sm:inline">Recent Sales</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-200 leading-tight">
                {user?.name || "Cashier User"}
              </p>
              <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">
                {user?.role || "Cashier"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Terminal Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Product Catalog & Fast Search */}
        <div className="flex-1 flex flex-col bg-slate-950 border-r border-slate-800/80 overflow-hidden">
          {/* Top Search & Filter Toolbar */}
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 w-full"
            >
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan barcode or search product name / code... (Ctrl+F)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900 text-white rounded-xl border border-slate-700/80 placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  <Barcode size={14} className="inline mr-1 text-slate-400" />
                  SCAN
                </div>
              )}
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading && allBatches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading inventory...</span>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <Package size={48} className="text-slate-700 mb-3" />
                <p className="text-base font-bold text-slate-400">
                  No Matching Products Found
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  Try scanning a barcode, typing a different product name, or clearing filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredBatches.map((batch) => {
                  const p = batch.product!;
                  const isLowStock = batch.remain_qty < 10;
                  const hasReturns = (batch.returned_qty || 0) > 0;

                  return (
                    <div
                      key={batch.id}
                      onClick={() => addToCart(batch)}
                      className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
                    >
                      {/* Return stock priority indicator */}
                      {hasReturns && (
                        <div className="absolute top-0 right-0 bg-amber-500/20 border-b border-l border-amber-500/40 text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                          Return Stock
                        </div>
                      )}

                      <div>
                        {/* Material Code / Barcode */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                          <span>{p.material_code}</span>
                          {p.barcode && (
                            <span className="truncate max-w-[80px]">
                              {p.barcode}
                            </span>
                          )}
                        </div>

                        {/* Product Title */}
                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 line-clamp-2 leading-snug transition-colors">
                          {p.name}
                        </h3>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Retail Price
                          </p>
                          <p className="text-sm font-black text-emerald-400">
                            LKR {Number(batch.retail_price).toFixed(2)}
                          </p>
                        </div>

                        {/* Stock Badge */}
                        <div
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isLowStock
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {batch.remain_qty} units
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cashier Cart & Summary */}
        <div className="w-full lg:w-[420px] bg-slate-900 flex flex-col border-l border-slate-800 shrink-0 overflow-hidden shadow-2xl">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/30">
                <Receipt size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Current Sale Cart
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {totalItemsCount} items selected
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-slate-400 hover:text-red-400 p-2 hover:bg-slate-800 rounded-xl transition-colors"
                title="Clear Cart"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Cart Items Scroll Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center mb-3 border border-slate-800">
                  <ShoppingCart size={28} className="text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-300">Cart is Empty</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click any product from the catalog or scan a barcode to add line items.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cart_id}
                  className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-2 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                        {item.product_name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Code: {item.material_code} | Batch #{item.batch_id}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cart_id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Quantity Controls & Line Pricing */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                    {/* Qty Counter */}
                    <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-1 border border-slate-800">
                      <button
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty - 1)
                        }
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-white font-mono">
                        {item.total_qty}
                      </span>
                      <button
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty + 1)
                        }
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Discount Input */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Disc:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_percentage || ""}
                        onChange={(e) =>
                          updateItemDiscount(
                            item.cart_id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-10 bg-slate-900 text-center text-xs font-bold text-amber-400 rounded border border-slate-800 py-0.5 focus:outline-none focus:border-amber-500"
                      />
                      <span>%</span>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-400 font-mono">
                        LKR {item.line_total.toFixed(2)}
                      </p>
                      {item.discount_amount > 0 && (
                        <p className="text-[9px] text-amber-400/90 line-through">
                          LKR {(item.total_qty * item.retail_price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Payment Drawer Launcher */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Gross Subtotal:</span>
                <span className="font-mono text-slate-200">
                  LKR {grossSubtotal.toFixed(2)}
                </span>
              </div>

              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Item Discounts:</span>
                  <span className="font-mono">
                    - LKR {totalItemDiscounts.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Additional Overall Discount */}
              <div className="flex items-center justify-between text-slate-400">
                <span>Extra Bill Discount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">LKR</span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscount || ""}
                    onChange={(e) =>
                      setOverallDiscount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-20 bg-slate-900 text-right text-xs font-bold text-amber-400 rounded border border-slate-800 px-2 py-0.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Grand Total:
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                  LKR {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Pay Now Button */}
            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <CreditCard size={18} />
              <span>Proceed to Pay (LKR {grandTotal.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Banknote className="text-emerald-400" size={22} />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Payment Checkout
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Payment Type Selection */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("cash")}
                    className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      paymentType === "cash"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Banknote size={16} />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType("card")}
                    className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                      paymentType === "card"
                        ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Card</span>
                  </button>
                </div>
              </div>

              {/* Amount Summary Box */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Total Amount Payable:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    LKR {grandTotal.toFixed(2)}
                  </span>
                </div>

                {paymentType === "cash" && (
                  <>
                    <div className="pt-2 border-t border-slate-900">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                        Cash Amount Tendered (LKR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="Enter cash received..."
                        className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl border border-slate-700 text-lg font-black font-mono focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex gap-2 pt-1 overflow-x-auto">
                      {[grandTotal, 100, 500, 1000, 5000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashTendered(preset.toString())}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold text-slate-300 rounded-lg shrink-0"
                        >
                          LKR {preset.toFixed(0)}
                        </button>
                      ))}
                    </div>

                    {/* Change Calculation Box */}
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">
                        Balance / Change Due:
                      </span>
                      <span
                        className={`text-base font-black font-mono ${
                          cashAmountNum >= grandTotal
                            ? "text-blue-400"
                            : "text-red-400"
                        }`}
                      >
                        LKR {changeDue.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  (paymentType === "cash" && cashAmountNum < grandTotal)
                }
                onClick={handleProcessCheckout}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
              >
                {loading ? (
                  <span className="animate-spin text-sm">↻</span>
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Confirm & Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt (Hidden from screen view, visible on print) */}
      {completedSale && (
        <div id="printable-receipt" className="hidden print:block text-black p-4 font-mono text-xs leading-snug">
          <div className="text-center font-bold mb-2">
            <h2 className="text-base uppercase tracking-widest">THEJANI TRADERS</h2>
            <p className="text-[10px]">Main Warehouse & Retail POS Counter</p>
            <p className="text-[10px]">Tel: 077-1234567 | Colombo, Sri Lanka</p>
            <div className="border-b border-black my-2" />
            <p className="text-xs uppercase">POS SALE RECEIPT</p>
            <p className="text-[10px]">Receipt #: {completedSale.id}</p>
            <p className="text-[10px]">
              Date: {completedSale.date_time || new Date().toLocaleString()}
            </p>
            <p className="text-[10px]">
              Cashier: {completedSale.user?.name || user?.name || "Cashier"}
            </p>
          </div>

          <div className="border-b border-black my-2" />

          {/* Line Items */}
          <table className="w-full text-left text-[10px] mb-2">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1">ITEM</th>
                <th className="py-1 text-center">QTY</th>
                <th className="py-1 text-right">PRICE</th>
                <th className="py-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {completedSale.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-dashed border-gray-400">
                  <td className="py-1 max-w-[120px] truncate">
                    {item.product?.name || item.product_name || "Product"}
                  </td>
                  <td className="py-1 text-center">{item.qty}</td>
                  <td className="py-1 text-right">
                    {Number(item.retail_price || item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-1 text-right">
                    {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-black my-2" />

          {/* Totals */}
          <div className="space-y-1 text-right text-[11px] font-bold">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>
                LKR{" "}
                {(
                  Number(completedSale.total) + Number(completedSale.discount || 0)
                ).toFixed(2)}
              </span>
            </div>
            {completedSale.discount > 0 && (
              <div className="flex justify-between">
                <span>Total Discount:</span>
                <span>- LKR {Number(completedSale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black border-t border-black pt-1">
              <span>GRAND TOTAL:</span>
              <span>LKR {Number(completedSale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-1">
              <span>Payment ({completedSale.payment_type?.toUpperCase()}):</span>
              <span>
                LKR{" "}
                {Number(
                  completedSale.cashTendered || completedSale.total
                ).toFixed(2)}
              </span>
            </div>
            {completedSale.changeDue !== undefined && (
              <div className="flex justify-between text-[10px]">
                <span>Change Due:</span>
                <span>LKR {Number(completedSale.changeDue).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="border-b border-black my-2" />
          <div className="text-center text-[10px] mt-3">
            <p>Thank you for shopping with us!</p>
            <p>Goods sold are returnable within 7 days with invoice.</p>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-blue-400" size={20} />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  POS Sales Register History
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {recentSales.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No sales recorded yet.
                </p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-400 text-sm">
                          Sale #{sale.id}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-400">
                          {sale.date_time}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                          {sale.payment_type || "cash"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Cashier:{" "}
                        <span className="text-slate-300 font-medium">
                          {sale.user?.name || "System"}
                        </span>{" "}
                        | Items: {sale.items?.length || 0} line items
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Total Bill</p>
                        <p className="text-base font-black text-emerald-400 font-mono">
                          LKR {Number(sale.total).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCompletedSale(sale);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                          title="Print Receipt"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleVoidSale(sale.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30"
                          title="Void Sale & Restore Stock"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosTerminal;
