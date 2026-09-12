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
  LogOut,
  AlertCircle,
  Maximize2,
  Minimize2,
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

// Currency Formatter Helper (LKR 1,250.00 format)
const formatCurrency = (amount: number): string => {
  const safeNum = isNaN(amount) ? 0 : amount;
  return `LKR ${safeNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PosTerminal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { refreshTotalValue } = useWarehouse();

  // Active cashier clock
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // POS Inventory & Filter State
  const [loading, setLoading] = useState(false);
  const [allBatches, setAllBatches] = useState<BatchStock[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchStock[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [stockFeedback, setStockFeedback] = useState<string | null>(null);

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

  // Fullscreen State & Management
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error toggling fullscreen mode:", err);
    }
  };

  // Search Input Reference
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial focus on search input without stealing active edit focus
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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

  // Focus Tracking for Dialogs
  const lastActiveElement = useRef<HTMLElement | null>(null);
  const paymentDialogRef = useRef<HTMLDivElement>(null);

  // Dialog Focus Trap & Restore
  useEffect(() => {
    if (isCheckoutOpen) {
      lastActiveElement.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (paymentDialogRef.current) {
          const firstInput = paymentDialogRef.current.querySelector<HTMLElement>('input, button');
          firstInput?.focus();
        }
      }, 50);
    } else if (lastActiveElement.current) {
      lastActiveElement.current.focus();
    }
  }, [isCheckoutOpen]);

  useEffect(() => {
    const handleDialogTab = (e: KeyboardEvent) => {
      if (!isCheckoutOpen || e.key !== 'Tab') return;
      if (!paymentDialogRef.current) return;

      const focusableElements = paymentDialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener('keydown', handleDialogTab);
    return () => window.removeEventListener('keydown', handleDialogTab);
  }, [isCheckoutOpen]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        const firstCartInput = document.querySelector<HTMLInputElement>('.cart-qty-input');
        if (firstCartInput) {
          firstCartInput.focus();
          firstCartInput.select();
        } else {
          searchInputRef.current?.focus();
        }
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        if (e.repeat) return;
        if (cart.length > 0 && !isCheckoutOpen) {
          setIsCheckoutOpen(true);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isCheckoutOpen) {
          e.preventDefault();
          setIsCheckoutOpen(false);
          return;
        }
        if (isHistoryOpen) {
          e.preventDefault();
          setIsHistoryOpen(false);
          return;
        }
        if (document.activeElement === searchInputRef.current) {
          setSearchTerm('');
          searchInputRef.current?.blur();
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isCheckoutOpen || isHistoryOpen) return;
        
        const activeElement = document.activeElement as HTMLElement;
        const tagName = activeElement?.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
        
        if (activeElement?.classList.contains('category-btn')) {
          const categories = Array.from(document.querySelectorAll<HTMLElement>('.category-btn'));
          const index = categories.indexOf(activeElement);
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            categories[(index + 1) % categories.length]?.focus();
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            categories[(index - 1 + categories.length) % categories.length]?.focus();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.querySelector<HTMLElement>('.product-add-btn')?.focus();
          }
        } else if (activeElement?.classList.contains('product-add-btn')) {
          const products = Array.from(document.querySelectorAll<HTMLElement>('.product-add-btn'));
          const index = products.indexOf(activeElement);
          
          let nextEl: HTMLElement | null = null;
          if (e.key === 'ArrowRight') nextEl = products[index + 1];
          if (e.key === 'ArrowLeft') nextEl = products[index - 1];
          if (e.key === 'ArrowUp') {
              const rect = activeElement.getBoundingClientRect();
              let minDistance = Infinity;
              for (let i = index - 1; i >= 0; i--) {
                  const pRect = products[i].getBoundingClientRect();
                  if (pRect.bottom < rect.top) {
                      const dist = Math.abs(pRect.left - rect.left);
                      if (dist < minDistance) {
                          minDistance = dist;
                          nextEl = products[i];
                      }
                  }
              }
              if (!nextEl) {
                  document.querySelector<HTMLElement>('.category-btn')?.focus();
                  e.preventDefault();
                  return;
              }
          }
          if (e.key === 'ArrowDown') {
              const rect = activeElement.getBoundingClientRect();
              let minDistance = Infinity;
              for (let i = index + 1; i < products.length; i++) {
                  const pRect = products[i].getBoundingClientRect();
                  if (pRect.top > rect.bottom) {
                      const dist = Math.abs(pRect.left - rect.left);
                      if (dist < minDistance) {
                          minDistance = dist;
                          nextEl = products[i];
                      }
                  }
              }
          }
          
          if (nextEl) {
            e.preventDefault();
            nextEl.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart.length, isCheckoutOpen, isHistoryOpen]);

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

    // FEFO (First Expiry First Out) sorting, then FIFO by ID
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

  // Handle Barcode Scanner / Search Form Submit
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
        setStockFeedback(
          `Stock limit reached! Only ${batch.remain_qty} units available for ${batch.product.name}.`
        );
        setTimeout(() => setStockFeedback(null), 4000);
        return;
      }
      updateCartItemQty(existing.cart_id, newQty);
    } else {
      const unitPrice = Number(batch.retail_price);
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
        retail_price: unitPrice,
        unit_price: unitPrice,
        discount_percentage: 0,
        discount_amount: 0,
        line_total: unitPrice,
        available_qty: batch.remain_qty,
      };
      setCart([...cart, newCartItem]);
    }
    setStockFeedback(null);
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
          setStockFeedback(
            `Maximum stock limit reached! Only ${item.available_qty} units available.`
          );
          setTimeout(() => setStockFeedback(null), 4000);
          return item;
        }

        const cases = Math.floor(newTotalQty / item.pack_size);
        const units = newTotalQty % item.pack_size;

        const grossTotal = newTotalQty * item.retail_price;
        const discountAmt = (grossTotal * item.discount_percentage) / 100;
        const lineTotal = grossTotal - discountAmt;
        const unitPrice =
          newTotalQty > 0 ? lineTotal / newTotalQty : item.retail_price;

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
        const unitPrice = item.total_qty > 0 ? lineTotal / item.total_qty : item.retail_price;

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
    if (window.confirm("Are you sure you want to clear all items in the current sale?")) {
      setCart([]);
      setCashTendered("");
      setOverallDiscount(0);
      setStockFeedback(null);
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

  // Complete Sale (Checkout API POST)
  const handleProcessCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentType === "cash" && cashAmountNum < grandTotal) {
      alert(`Insufficient cash tendered! Total payable is ${formatCurrency(grandTotal)}.`);
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

      // Clear cart and close checkout modal
      setCart([]);
      setCashTendered("");
      setOverallDiscount(0);
      setIsCheckoutOpen(false);

      // Trigger automatic print
      setTimeout(() => {
        window.print();
      }, 400);
    } catch (err: any) {
      console.error("Checkout Error:", err);
      const errMsg =
        err.response?.data?.message ||
        "Transaction failed! Please check item stock levels.";
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Void Sale from History (DELETE API call)
  const handleVoidSale = async (saleId: number) => {
    if (
      !window.confirm(
        `Are you sure you want to void Sale #${saleId}? Stock will be restored to warehouse inventory.`
      )
    )
      return;

    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/sales/${saleId}`);
      await refreshTotalValue();
      await fetchInventory();
      await fetchHistory();
      alert(`Sale #${saleId} voided successfully! Inventory restored.`);
    } catch (err: any) {
      console.error("Void Error:", err);
      alert("Failed to void sale transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* 1. Header Workspace Bar */}
      <header className="h-16 bg-white border-b border-stone-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Thejani Traders
              </h1>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">
              Sales counter
            </p>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-stone-100 px-3 py-1.5 rounded-md border border-stone-200 font-mono tabular-nums">
          <Calendar size={14} className="text-slate-400" />
          <span>{new Date().toLocaleDateString()}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-900 font-semibold">{currentTime}</span>
        </div>

        {/* Right Cashier Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-slate-700 px-3 py-1.5 rounded-md border border-stone-300 text-xs font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          >
            <History size={15} className="text-slate-500" />
            <span>Recent sales</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-slate-700 px-3 py-1.5 rounded-md border border-stone-300 text-xs font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/50"
            title={isFullscreen ? "Exit full screen" : "Enter full screen"}
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? (
              <Minimize2 size={15} className="text-slate-500" />
            ) : (
              <Maximize2 size={15} className="text-slate-500" />
            )}
            <span>{isFullscreen ? "Exit full screen" : "Full screen"}</span>
          </button>

          <div className="h-5 w-[1px] bg-stone-200 hidden sm:block" />

          {/* Cashier Badge */}
          <div className="hidden sm:flex items-center gap-2 text-left">
            <div className="w-7 h-7 rounded bg-teal-800 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-900 leading-tight">
                {user?.name || "Cashier User"}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                {user?.role || "Cashier"}
              </p>
            </div>
          </div>

          {/* Exit / Logout Action */}
          {user?.role === "cashier" ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold px-2 py-1 transition-colors ml-1"
              title="Log out session"
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 text-xs font-semibold px-2 py-1 transition-colors ml-1"
              title="Exit POS to admin sales"
            >
              <ArrowLeft size={15} />
              <span>Exit POS</span>
            </button>
          )}
        </div>
      </header>

      {/* Stock Error Feedback Banner */}
      {stockFeedback && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-800 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>{stockFeedback}</span>
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Section: Search & Product Catalog */}
        <div className="flex-1 flex flex-col bg-[#f8f9fa] border-r border-stone-200 overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-4 bg-white border-b border-stone-200 space-y-3">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="w-full">
              <label
                htmlFor="pos-search"
                className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5"
              >
                Scan barcode or search products
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="pos-search"
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.repeat) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter product title, barcode, or material SKU..."
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 text-slate-900 rounded-lg border border-stone-300 placeholder-slate-400 text-sm font-medium focus:outline-none focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors shadow-inner"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Clear search input"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-stone-200/80 px-2 py-0.5 rounded">
                    <Barcode size={14} className="text-slate-500" />
                    <span>BARCODE</span>
                  </div>
                )}
              </div>
            </form>

            {/* Category Filter Pills & Items Count */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`category-btn px-3 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-700/50 focus:border-teal-700 ${
                      selectedCategory === cat
                        ? "bg-teal-800 text-white shadow-sm"
                        : "bg-stone-100 text-slate-600 hover:bg-stone-200 border border-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                {filteredBatches.length} available items
              </span>
            </div>
          </div>

          {/* Product Catalog Grid (Independently Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading && allBatches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Loading inventory catalog...</span>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <Package size={40} className="text-stone-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No Matching Products Found
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Try scanning a barcode or clearing search keywords.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredBatches.map((batch) => {
                  const p = batch.product!;
                  const isLowStock = batch.remain_qty <= 10;
                  const hasReturns = (batch.returned_qty || 0) > 0;

                  return (
                    <div
                      key={batch.id}
                      onClick={() => addToCart(batch)}
                      className="bg-white border border-stone-200 hover:border-teal-700/60 rounded-lg p-3.5 flex flex-col justify-between transition-colors shadow-sm group relative cursor-pointer"
                    >
                      {hasReturns && (
                        <span className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                          Return Pool
                        </span>
                      )}

                      <div>
                        {/* Title */}
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 line-clamp-2 leading-snug mb-1">
                          {p.name}
                        </h3>

                        {/* Pack size & Codes */}
                        <div className="space-y-0.5 text-[11px] text-slate-500 font-medium">
                          <p>Pack size: {batch.pack_size || 1}</p>
                          <p className="font-mono text-[10px] text-slate-400 truncate">
                            SKU: {p.material_code}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Price & Add Hit Target */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Price
                          </p>
                          <p className="text-xs font-bold text-slate-900 tabular-nums">
                            {formatCurrency(Number(batch.retail_price))}
                          </p>
                          <p
                            className={`text-[10px] font-medium ${
                              isLowStock ? "text-red-600 font-semibold" : "text-slate-500"
                            }`}
                          >
                            {batch.remain_qty} in stock
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(batch);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.repeat) {
                              e.preventDefault();
                            }
                          }}
                          className="product-add-btn min-h-[36px] min-w-[56px] px-3 py-1.5 bg-stone-100 text-teal-800 group-hover:bg-teal-800 group-hover:text-white group-hover:border-teal-800 focus:bg-teal-800 focus:text-white focus:border-teal-800 font-bold text-xs rounded border border-stone-300 transition-colors flex items-center justify-center gap-1 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-700/50"
                          aria-label={`Add ${p.name} to cart`}
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Current Sale Cart & Checkout Panel */}
        <div className="w-full lg:w-[420px] xl:w-[440px] bg-white flex flex-col border-l border-stone-200 shrink-0 overflow-hidden shadow-sm">
          {/* Cart Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Current sale</span>
                <span className="bg-stone-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                  {cart.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {totalItemsCount} total units selected
              </p>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-slate-500 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-stone-200 transition-colors"
                title="Clear current cart"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Row Items (Independently Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3 border border-stone-200">
                  <ShoppingCart size={22} className="text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Scan a barcode or add a product to start.
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Select products from the catalog or use a barcode reader to construct the customer order.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cart_id}
                  className="bg-stone-50/70 border border-stone-200 rounded-lg p-3 flex flex-col gap-2 transition-colors hover:border-stone-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {item.product_name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        SKU: {item.material_code} | Batch #{item.batch_id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cart_id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-stone-200 transition-colors"
                      aria-label={`Remove ${item.product_name} from cart`}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Quantity Controls & Line Pricing */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                    {/* Qty +/- Input */}
                    <div className="flex items-center gap-1 bg-white rounded border border-stone-300 p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty - 1)
                        }
                        className="min-w-[28px] min-h-[28px] rounded hover:bg-stone-100 flex items-center justify-center text-slate-700 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.available_qty}
                        value={item.total_qty}
                        onChange={(e) =>
                          updateCartItemQty(
                            item.cart_id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="cart-qty-input w-10 text-center text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/50 focus:bg-white rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty + 1)
                        }
                        className="min-w-[28px] min-h-[28px] rounded hover:bg-stone-100 flex items-center justify-center text-slate-700 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Per-item Discount Input */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
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
                        className="w-10 bg-white text-center text-xs font-bold text-slate-900 rounded border border-stone-300 py-0.5 focus:outline-none focus:border-teal-700"
                      />
                      <span>%</span>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.line_total)}
                      </p>
                      {item.discount_amount > 0 && (
                        <p className="text-[10px] text-amber-700 font-medium line-through">
                          {formatCurrency(item.total_qty * item.retail_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Fixed Bottom Checkout Summary */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(grossSubtotal)}
                </span>
              </div>

              {totalItemDiscounts > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Item discounts</span>
                  <span className="tabular-nums">
                    - {formatCurrency(totalItemDiscounts)}
                  </span>
                </div>
              )}

              {/* Bill Discount Input */}
              <div className="flex items-center justify-between text-slate-600">
                <span>Bill discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">LKR</span>
                  <input
                    type="number"
                    min="0"
                    value={overallDiscount || ""}
                    onChange={(e) =>
                      setOverallDiscount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-24 bg-white text-right text-xs font-bold text-slate-900 rounded border border-stone-300 px-2 py-0.5 focus:outline-none focus:border-teal-700 tabular-nums"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">
                  Total
                </span>
                <span className="text-xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Primary Payment Action Button */}
            {cart.length === 0 ? (
              <div className="text-center">
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 bg-stone-200 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-md cursor-not-allowed border border-stone-300"
                >
                  Pay · {formatCurrency(0)}
                </button>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Add items to proceed with payment.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white font-bold text-sm rounded-md shadow-sm flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-teal-700/40"
              >
                <CreditCard size={18} />
                <span>Pay · {formatCurrency(grandTotal)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Payment Checkout Dialog */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            ref={paymentDialogRef}
            className="bg-white border border-stone-300 rounded-lg w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Dialog Header */}
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="text-teal-800" size={20} />
                <h3 className="text-sm font-bold text-slate-900">
                  Checkout payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                aria-label="Close payment dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4">
              {/* Payment Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("cash")}
                    className={`py-2.5 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 border transition-colors ${
                      paymentType === "cash"
                        ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                        : "bg-white border-stone-300 text-slate-700 hover:bg-stone-50"
                    }`}
                  >
                    <Banknote size={16} />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType("card")}
                    className={`py-2.5 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 border transition-colors ${
                      paymentType === "card"
                        ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                        : "bg-white border-stone-300 text-slate-700 hover:bg-stone-50"
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Card</span>
                  </button>
                </div>
              </div>

              {/* Amount Summary Box */}
              <div className="p-4 bg-stone-50 rounded-md border border-stone-200 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-slate-600">
                    Grand Total Payable:
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {paymentType === "cash" && (
                  <>
                    <div className="pt-2 border-t border-stone-200">
                      <label
                        htmlFor="cash-tendered-input"
                        className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1"
                      >
                        Cash Amount Received
                      </label>
                      <input
                        id="cash-tendered-input"
                        type="number"
                        step="0.01"
                        autoFocus
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white text-slate-900 rounded border border-stone-300 text-base font-bold font-mono focus:outline-none focus:border-teal-700 tabular-nums"
                      />
                    </div>

                    {/* Quick Cash Presets */}
                    <div className="flex gap-1.5 overflow-x-auto pt-1">
                      {[grandTotal, 100, 500, 1000, 5000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashTendered(preset.toString())}
                          className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 text-[11px] font-semibold text-slate-700 rounded shrink-0 tabular-nums"
                        >
                          {preset === grandTotal ? "Exact" : `LKR ${preset}`}
                        </button>
                      ))}
                    </div>

                    {/* Change Due Box */}
                    <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">
                        Change Due:
                      </span>
                      <span
                        className={`text-sm font-bold font-mono tabular-nums ${
                          cashAmountNum >= grandTotal
                            ? "text-teal-800"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(changeDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded border border-stone-300 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors"
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.repeat) {
                    e.preventDefault();
                  }
                }}
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold text-xs rounded shadow-sm flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-700"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Confirm & Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Thermal Receipt View (Print Only) */}
      {completedSale && (
        <div id="printable-receipt" className="hidden print:block text-black p-4 font-mono text-xs leading-snug">
          <div className="text-center font-bold mb-2">
            <h2 className="text-base uppercase tracking-widest">THEJANI TRADERS</h2>
            <p className="text-[10px]">Sales Counter & Warehouse</p>
            <p className="text-[10px]">Tel: 077-1234567 | Colombo, Sri Lanka</p>
            <div className="border-b border-black my-2" />
            <p className="text-xs uppercase">POS RECEIPT</p>
            <p className="text-[10px]">Receipt #: {completedSale.id}</p>
            <p className="text-[10px]">
              Date: {completedSale.date_time || new Date().toLocaleString()}
            </p>
            <p className="text-[10px]">
              Cashier: {completedSale.user?.name || user?.name || "Cashier"}
            </p>
          </div>

          <div className="border-b border-black my-2" />

          {/* Items */}
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
                    {formatCurrency(Number(item.retail_price || item.unit_price))}
                  </td>
                  <td className="py-1 text-right">
                    {formatCurrency(Number(item.total))}
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
                {formatCurrency(
                  Number(completedSale.total) + Number(completedSale.discount || 0)
                )}
              </span>
            </div>
            {completedSale.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>- {formatCurrency(Number(completedSale.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black border-t border-black pt-1">
              <span>TOTAL:</span>
              <span>{formatCurrency(Number(completedSale.total))}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-1">
              <span>Payment ({completedSale.payment_type?.toUpperCase()}):</span>
              <span>
                {formatCurrency(
                  Number(completedSale.cashTendered || completedSale.total)
                )}
              </span>
            </div>
            {completedSale.changeDue !== undefined && (
              <div className="flex justify-between text-[10px]">
                <span>Change Due:</span>
                <span>{formatCurrency(Number(completedSale.changeDue))}</span>
              </div>
            )}
          </div>

          <div className="border-b border-black my-2" />
          <div className="text-center text-[10px] mt-3">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      )}

      {/* 5. Recent Sales History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-teal-800" size={18} />
                <h3 className="text-sm font-bold text-slate-900">
                  Recent sales register history
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                aria-label="Close sales history modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
              {recentSales.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-xs">
                  No sales recorded yet.
                </p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-stone-50 border border-stone-200 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-800 text-xs">
                          Sale #{sale.id}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500">
                          {sale.date_time}
                        </span>
                        <span className="bg-stone-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {sale.payment_type || "cash"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Cashier: {sale.user?.name || "System"} | {sale.items?.length || 0} items
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">
                          Total
                        </p>
                        <p className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatCurrency(Number(sale.total))}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCompletedSale(sale);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="p-1.5 bg-white hover:bg-stone-100 text-slate-700 rounded border border-stone-300"
                          title="Print Receipt"
                          aria-label="Print receipt"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVoidSale(sale.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200"
                          title="Void Sale & Restore Inventory"
                          aria-label="Void transaction"
                        >
                          <RotateCcw size={15} />
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
