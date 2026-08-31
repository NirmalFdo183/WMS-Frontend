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
  Pencil,
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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Fast Item Entry Modal State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchStock | null>(null);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState<string>("1");
  const [quickPrice, setQuickPrice] = useState<string>("");
  const [quickDiscount, setQuickDiscount] = useState<string>("0");
  const [quickModalError, setQuickModalError] = useState<string | null>(null);

  const quickQtyInputRef = useRef<HTMLInputElement>(null);

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

  // Search Input Reference & Row References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Initial focus on search input without stealing active edit focus
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Reset selected index when filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, selectedCategory]);

  // Scroll active batch row into view
  useEffect(() => {
    if (rowRefs.current[selectedIndex]) {
      rowRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

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
      setFilteredBatches([]);

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
        if (quickAddOpen) {
          e.preventDefault();
          setQuickAddOpen(false);
          setQuickModalError(null);
          searchInputRef.current?.focus();
          return;
        }
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
        }
        return;
      }

      // Arrow navigation for batch rows (when no modal is open)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (isCheckoutOpen || isHistoryOpen || quickAddOpen) return;
        
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.classList.contains('cart-qty-input')) return;

        if (filteredBatches.length > 0) {
          e.preventDefault();
          if (e.key === 'ArrowDown') {
            setSelectedIndex((prev) => (prev < filteredBatches.length - 1 ? prev + 1 : prev));
          } else if (e.key === 'ArrowUp') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
        }
        return;
      }

      // Enter key to open Fast Item Entry Modal for highlighted row
      if (e.key === 'Enter') {
        if (isCheckoutOpen || isHistoryOpen || quickAddOpen) return;
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.classList.contains('cart-qty-input')) return;

        if (filteredBatches.length > 0 && selectedIndex >= 0 && selectedIndex < filteredBatches.length) {
          e.preventDefault();
          openQuickAddModal(filteredBatches[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart.length, isCheckoutOpen, isHistoryOpen, quickAddOpen, filteredBatches, selectedIndex]);

  // Filter batches by search query & category (Only show matching rows when typing)
  useEffect(() => {
    if (searchTerm.trim() === "") {
      if (selectedCategory !== "All") {
        const result = allBatches.filter(
          (b) => (b.product?.category || "General") === selectedCategory
        );
        result.sort((a, b) => {
          if (a.expiry_date && b.expiry_date) {
            return (
              new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            );
          }
          return a.id - b.id;
        });
        setFilteredBatches(result);
      } else {
        setFilteredBatches([]);
      }
      return;
    }

    let result = allBatches;

    if (selectedCategory !== "All") {
      result = result.filter(
        (b) => (b.product?.category || "General") === selectedCategory
      );
    }

    const query = searchTerm.toLowerCase().trim();
    result = result.filter(
      (b) =>
        b.product?.name.toLowerCase().includes(query) ||
        b.product?.barcode?.toLowerCase().includes(query) ||
        b.product?.material_code?.toLowerCase().includes(query) ||
        b.product?.id?.toString().includes(query) ||
        b.id?.toString().includes(query)
    );

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

  // Open Fast Item Entry Modal (from Search / Catalog)
  const openQuickAddModal = (batch: BatchStock) => {
    if (!batch.product) return;
    setSelectedBatch(batch);
    setEditingCartId(null);
    setQuickQty("1");
    setQuickPrice(Number(batch.retail_price).toFixed(2));
    setQuickDiscount("0");
    setQuickModalError(null);
    setQuickAddOpen(true);

    setTimeout(() => {
      quickQtyInputRef.current?.focus();
      quickQtyInputRef.current?.select();
    }, 50);
  };

  // Open Fast Item Entry Modal for editing existing Cart row
  const openEditCartItemModal = (item: CartItem) => {
    const batch = allBatches.find((b) => b.id === item.batch_id) || {
      id: item.batch_id,
      remain_qty: item.available_qty,
      retail_price: item.retail_price,
      netprice: 0,
      pack_size: item.pack_size,
      product: {
        id: item.product_id,
        name: item.product_name,
        material_code: item.material_code,
        barcode: item.barcode,
      },
    };

    setSelectedBatch(batch);
    setEditingCartId(item.cart_id);
    setQuickQty(item.total_qty.toString());
    setQuickPrice(Number(item.retail_price).toFixed(2));
    setQuickDiscount((item.discount_percentage || 0).toString());
    setQuickModalError(null);
    setQuickAddOpen(true);

    setTimeout(() => {
      quickQtyInputRef.current?.focus();
      quickQtyInputRef.current?.select();
    }, 50);
  };

  // Submit Quick Add to Cart or Update Existing Row
  const submitQuickAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBatch || !selectedBatch.product) return;

    const qty = parseInt(quickQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setQuickModalError("Please enter a valid quantity of at least 1 unit.");
      quickQtyInputRef.current?.focus();
      return;
    }

    if (qty > selectedBatch.remain_qty) {
      setQuickModalError(
        `Insufficient stock! Only ${selectedBatch.remain_qty} units available in Batch #${selectedBatch.id}.`
      );
      quickQtyInputRef.current?.focus();
      return;
    }

    const price = parseFloat(quickPrice);
    if (isNaN(price) || price < 0) {
      setQuickModalError("Please enter a valid selling price.");
      return;
    }

    const discPercent = Math.min(100, Math.max(0, parseFloat(quickDiscount) || 0));
    const grossTotal = qty * price;
    const discountAmt = (grossTotal * discPercent) / 100;
    const lineTotal = grossTotal - discountAmt;
    const unitPrice = qty > 0 ? lineTotal / qty : price;

    if (editingCartId) {
      // Editing existing cart item directly
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.cart_id === editingCartId
            ? {
                ...item,
                total_qty: qty,
                cases: Math.floor(qty / (item.pack_size || 1)),
                units: qty % (item.pack_size || 1),
                retail_price: price,
                discount_percentage: discPercent,
                discount_amount: discountAmt,
                unit_price: unitPrice,
                line_total: lineTotal,
              }
            : item
        )
      );
    } else {
      // Adding from Search or Catalog
      const existingIndex = cart.findIndex(
        (item) => item.batch_id === selectedBatch.id
      );

      if (existingIndex > -1) {
        const existing = cart[existingIndex];
        const newTotalQty = existing.total_qty + qty;
        if (newTotalQty > selectedBatch.remain_qty) {
          setStockFeedback(
            `Cannot add! Combined cart quantity (${newTotalQty}) exceeds available stock (${selectedBatch.remain_qty}) for ${selectedBatch.product.name}.`
          );
          setTimeout(() => setStockFeedback(null), 4000);
          setQuickAddOpen(false);
          setSearchTerm("");
          searchInputRef.current?.focus();
          return;
        }

        const newGross = newTotalQty * price;
        const newDisc = (newGross * discPercent) / 100;
        const newLineTotal = newGross - newDisc;
        const newUnitPrice = newTotalQty > 0 ? newLineTotal / newTotalQty : price;

        setCart((prevCart) =>
          prevCart.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  total_qty: newTotalQty,
                  cases: Math.floor(newTotalQty / (item.pack_size || 1)),
                  units: newTotalQty % (item.pack_size || 1),
                  retail_price: price,
                  discount_percentage: discPercent,
                  discount_amount: newDisc,
                  unit_price: newUnitPrice,
                  line_total: newLineTotal,
                }
              : item
          )
        );
      } else {
        const newCartItem: CartItem = {
          cart_id: `${selectedBatch.id}-${Date.now()}`,
          batch_id: selectedBatch.id,
          product_id: selectedBatch.product.id,
          product_name: selectedBatch.product.name,
          material_code: selectedBatch.product.material_code,
          barcode: selectedBatch.product.barcode,
          pack_size: selectedBatch.pack_size || 1,
          cases: Math.floor(qty / (selectedBatch.pack_size || 1)),
          units: qty % (selectedBatch.pack_size || 1),
          total_qty: qty,
          retail_price: price,
          unit_price: unitPrice,
          discount_percentage: discPercent,
          discount_amount: discountAmt,
          line_total: lineTotal,
          available_qty: selectedBatch.remain_qty,
        };
        setCart((prev) => [...prev, newCartItem]);
      }
    }

    setQuickAddOpen(false);
    setEditingCartId(null);
    setSearchTerm("");
    setQuickModalError(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Handle Barcode Scanner / Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAddOpen) return;
    if (filteredBatches.length === 0) return;

    // Check for exact barcode or material code match
    const exactMatch = filteredBatches.find(
      (b) =>
        b.product?.barcode === searchTerm.trim() ||
        b.product?.material_code === searchTerm.trim()
    );

    if (exactMatch) {
      openQuickAddModal(exactMatch);
    } else if (selectedIndex >= 0 && selectedIndex < filteredBatches.length) {
      openQuickAddModal(filteredBatches[selectedIndex]);
    } else if (filteredBatches.length > 0) {
      openQuickAddModal(filteredBatches[0]);
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
    <>
      {/* ---------------------------------------------------------
          POS Terminal Screen Interface (Completely hidden on print)
         --------------------------------------------------------- */}
      <div className="h-screen max-h-screen overflow-hidden bg-[#f8f9fa] text-slate-900 flex flex-col font-sans select-none antialiased print:hidden">
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Section: Search & Product Catalog */}
        <div className="flex-1 flex flex-col bg-[#f8f9fa] border-r border-stone-200 overflow-hidden min-h-0">
          {/* Top Search & Filter Bar */}
          <div className="p-4 bg-white border-b border-stone-200 space-y-3 shrink-0">
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
                {searchTerm.trim() || selectedCategory !== "All"
                  ? `${filteredBatches.length} matching ${filteredBatches.length === 1 ? "batch" : "batches"}`
                  : `Ready to search · ${allBatches.length} stock items`}
              </span>
            </div>
          </div>

          {/* Batch Rows Table (Independently Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-white">
            {loading && allBatches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 gap-2 p-8">
                <div className="w-5 h-5 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Loading inventory catalog...</span>
              </div>
            ) : !searchTerm.trim() && selectedCategory === "All" ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center select-none">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mb-4 text-teal-800 shadow-xs">
                  <Barcode size={32} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  Ready to Scan or Search
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6">
                  Scan a barcode or type a product name, material SKU, or ID above to view matching stock batches.
                </p>

                {/* Quick start helper shortcuts */}
                <div className="grid grid-cols-2 gap-3 max-w-sm w-full text-left">
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <kbd className="px-1 py-0.5 bg-white rounded border border-stone-300 font-mono text-[10px]">F2</kbd>
                      <span>Focus Search</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Jump directly to barcode / product search</p>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <kbd className="px-1 py-0.5 bg-white rounded border border-stone-300 font-mono text-[10px]">↵ Enter</kbd>
                      <span>Quick Add</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Add top match directly to customer sale</p>
                  </div>
                </div>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <Package size={40} className="text-stone-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No Matching Batches Found
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  No items matched &ldquo;{searchTerm}&rdquo;. Please verify barcode or spelling.
                </p>
              </div>
            ) : (
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                  <thead className="bg-stone-50 sticky top-0 z-10 border-b border-stone-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none shadow-xs">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3">SKU / Barcode</th>
                      <th className="py-2.5 px-3">Batch Info</th>
                      <th className="py-2.5 px-3 text-center">Pack</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Retail Price</th>
                      <th className="py-2.5 pr-4 pl-3 text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/80 bg-white">
                    {filteredBatches.map((batch, idx) => {
                      const p = batch.product!;
                      const isSelected = selectedIndex === idx;
                      const isLowStock = batch.remain_qty <= 10;
                      const hasReturns = (batch.returned_qty || 0) > 0;

                      return (
                        <tr
                          key={batch.id}
                          ref={(el) => {
                            rowRefs.current[idx] = el;
                          }}
                          onClick={() => {
                            setSelectedIndex(idx);
                            openQuickAddModal(batch);
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-teal-50/90 text-slate-900 font-medium"
                              : "hover:bg-stone-50/80 text-slate-700"
                          }`}
                        >
                          {/* Row Indicator / Number */}
                          <td className={`py-2.5 pl-3 pr-2 text-center whitespace-nowrap border-l-4 transition-colors ${
                            isSelected ? "border-l-teal-800" : "border-l-transparent"
                          }`}>
                            {isSelected ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-teal-800 text-white text-[10px] font-bold shadow-xs">
                                ▶
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </span>
                            )}
                          </td>

                          {/* Product Description */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold leading-tight ${isSelected ? "text-teal-950" : "text-slate-900"}`}>
                                {p.name}
                              </span>
                              {p.category && (
                                <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* SKU & Barcode */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-slate-700 font-semibold">
                                {p.material_code || "-"}
                              </span>
                              {p.barcode && (
                                <span className="text-[10px] text-slate-400">
                                  {p.barcode}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Batch Info & Expiry */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-stone-100 text-slate-700 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border border-stone-200">
                                Batch #{batch.id}
                              </span>
                              {hasReturns && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                  Return Pool
                                </span>
                              )}
                            </div>
                            {batch.expiry_date && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Exp: {batch.expiry_date}
                              </p>
                            )}
                          </td>

                          {/* Pack Size */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-600">
                            {batch.pack_size || 1}
                          </td>

                          {/* Stock */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                                isLowStock
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {batch.remain_qty}
                            </span>
                          </td>

                          {/* Retail Price */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                              {formatCurrency(Number(batch.retail_price))}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-2.5 pr-4 pl-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickAddModal(batch);
                              }}
                              className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors shadow-xs ${
                                isSelected
                                  ? "bg-teal-800 text-white hover:bg-teal-900"
                                  : "bg-stone-100 text-slate-700 hover:bg-teal-800 hover:text-white border border-stone-300"
                              }`}
                            >
                              <Plus size={13} />
                              <span>Add</span>
                              {isSelected && (
                                <span className="text-[10px] bg-teal-950/60 px-1 py-0.2 rounded font-mono ml-0.5">
                                  ↵ Enter
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Keyboard Shortcut Hint Bar */}
          <div className="px-4 py-2 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-medium shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">↵ Enter</kbd>
                <span>Add Item</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">F2</kbd>
                <span>Search</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">F8</kbd>
                <span>Cart Qty</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-stone-300 shadow-xs font-mono font-bold text-slate-700">F9</kbd>
                <span>Pay</span>
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">
              {filteredBatches.length > 0 ? `Row ${selectedIndex + 1} of ${filteredBatches.length}` : '0 results'}
            </span>
          </div>
        </div>

        {/* Right Section: Current Sale Cart & Checkout Panel */}
        <div className="w-full lg:w-[480px] xl:w-[540px] bg-white flex flex-col border-l border-stone-200 shrink-0 overflow-hidden shadow-sm h-full min-h-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
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
                className="text-xs text-slate-500 hover:text-red-700 font-medium flex items-center gap-1 px-2.5 py-1 rounded hover:bg-stone-200 transition-colors cursor-pointer"
                title="Clear current cart"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Table Header */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-stone-100/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              <span className="flex-1">Item</span>
              <span className="w-32 text-center">Qty</span>
              <span className="w-28 text-right pr-2">Total</span>
              <span className="w-8 text-center"></span>
            </div>
          )}

          {/* Cart Row Items (Independently Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-white min-h-0">
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
                  className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-stone-50/60 hover:bg-stone-50 hover:border-stone-300 transition-colors gap-2"
                >
                  {/* 1. Item Name & Unit Price */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h4
                      className="text-xs sm:text-sm font-bold text-slate-900 truncate cursor-pointer hover:text-teal-700 transition-colors"
                      title={`${item.product_name} (Click to edit)`}
                      onClick={() => openEditCartItemModal(item)}
                    >
                      {item.product_name}
                    </h4>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{formatCurrency(item.retail_price)}</span>
                      {item.discount_percentage > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          -{item.discount_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Quantity (Editable Input + Steppers + Edit Modal Button) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center bg-white rounded-md border border-stone-300 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty - 1)
                        }
                        className="w-6 h-6 rounded hover:bg-stone-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                        title="Decrease quantity"
                      >
                        <Minus size={11} />
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
                        className="cart-qty-input w-10 text-center text-xs font-bold text-slate-900 font-mono focus:outline-none"
                        title="Edit quantity"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQty(item.cart_id, item.total_qty + 1)
                        }
                        className="w-6 h-6 rounded hover:bg-stone-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                        title="Increase quantity"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Quick Edit Pencil Icon to edit price/discount/qty in modal */}
                    <button
                      type="button"
                      onClick={() => openEditCartItemModal(item)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                      title="Edit Price, Discount or Qty"
                      aria-label="Edit item details"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>

                  {/* 3. Total Value */}
                  <div className="w-24 sm:w-28 text-right shrink-0 pr-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(item.line_total)}
                    </p>
                    {item.discount_amount > 0 && (
                      <p className="text-[10px] text-amber-700 font-medium font-mono line-through">
                        {formatCurrency(item.total_qty * item.retail_price)}
                      </p>
                    )}
                  </div>

                  {/* 4. Delete Button at End */}
                  <div className="w-8 flex justify-center shrink-0">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cart_id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.product_name} from cart`}
                      title="Remove from cart"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Fixed Bottom Checkout Summary */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 shrink-0">
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

      {/* 2.5 Fast Item Entry Modal (Quick Add to Cart) */}
      {quickAddOpen && selectedBatch && selectedBatch.product && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-teal-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-teal-800 text-teal-100 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-700/60 uppercase tracking-wider">
                    {selectedBatch.product.category || "General"}
                  </span>
                  <span className="bg-teal-800 text-teal-100 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-700/60 font-mono">
                    Batch #{selectedBatch.id}
                  </span>
                  {selectedBatch.expiry_date && (
                    <span className="text-[10px] text-teal-200/90 font-mono">
                      Exp: {selectedBatch.expiry_date}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {selectedBatch.product.name}
                </h3>
                <p className="text-xs text-teal-200/80 font-mono mt-0.5">
                  SKU: {selectedBatch.product.material_code} {selectedBatch.product.barcode ? `| Barcode: ${selectedBatch.product.barcode}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen(false);
                  setQuickModalError(null);
                  searchInputRef.current?.focus();
                }}
                className="text-teal-200 hover:text-white p-1.5 rounded-lg hover:bg-teal-800/60 transition-colors cursor-pointer"
                aria-label="Close fast item entry modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={submitQuickAdd} className="p-5 space-y-4">
              {/* Stock & Pack Info Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Available Stock:</span>
                  <span className="text-sm font-black text-emerald-900 font-mono">
                    {selectedBatch.remain_qty} units
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Pack Size:</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {selectedBatch.pack_size || 1}
                  </span>
                </div>
              </div>

              {/* Quantity & Selling Price Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Quantity Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity (Units) *
                  </label>
                  <div className="flex items-center rounded-lg border border-stone-300 bg-stone-50 focus-within:bg-white focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const q = parseInt(quickQty, 10) || 1;
                        if (q > 1) setQuickQty((q - 1).toString());
                        quickQtyInputRef.current?.focus();
                      }}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-stone-200 rounded-md font-bold transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      ref={quickQtyInputRef}
                      type="number"
                      min="1"
                      max={selectedBatch.remain_qty}
                      value={quickQty}
                      onChange={(e) => setQuickQty(e.target.value)}
                      className="w-full text-center text-base font-bold font-mono text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const q = parseInt(quickQty, 10) || 0;
                        if (q < selectedBatch.remain_qty) setQuickQty((q + 1).toString());
                        quickQtyInputRef.current?.focus();
                      }}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-stone-200 rounded-md font-bold transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Selling Price Input (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price (LKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      LKR
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm font-bold font-mono text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/20 tabular-nums transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Discount % Input & Presets */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Item Discount (%)
                  </label>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setQuickDiscount(pct.toString());
                          quickQtyInputRef.current?.focus();
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                          parseFloat(quickDiscount) === pct
                            ? "bg-teal-800 text-white border-teal-800"
                            : "bg-stone-100 text-slate-600 border-stone-200 hover:bg-stone-200"
                        }`}
                        tabIndex={-1}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={quickDiscount}
                    onChange={(e) => setQuickDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/20 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {quickModalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium animate-in fade-in duration-100">
                  <AlertCircle size={15} className="text-red-600 shrink-0" />
                  <span>{quickModalError}</span>
                </div>
              )}

              {/* Live Calculation Total Box */}
              {(() => {
                const modalQtyNum = parseInt(quickQty, 10) || 0;
                const modalPriceNum = parseFloat(quickPrice) || 0;
                const modalDiscPercent = Math.min(100, Math.max(0, parseFloat(quickDiscount) || 0));
                const modalGross = modalQtyNum * modalPriceNum;
                const modalDiscAmt = (modalGross * modalDiscPercent) / 100;
                const modalLineTotal = Math.max(0, modalGross - modalDiscAmt);

                return (
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross: {modalQtyNum} × {formatCurrency(modalPriceNum)}</span>
                      <span className="font-mono">{formatCurrency(modalGross)}</span>
                    </div>
                    {modalDiscAmt > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Discount ({modalDiscPercent}%):</span>
                        <span className="font-mono">- {formatCurrency(modalDiscAmt)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-bold text-slate-900">
                      <span className="text-sm">Line Total:</span>
                      <span className="text-lg font-black font-mono text-teal-900 tabular-nums">
                        {formatCurrency(modalLineTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddOpen(false);
                    setQuickModalError(null);
                    searchInputRef.current?.focus();
                  }}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-slate-700 hover:bg-stone-100 transition-colors"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add to Cart (↵ Enter)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
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
                            className="p-1.5 bg-white hover:bg-stone-100 text-slate-700 rounded border border-stone-300 cursor-pointer"
                            title="Print Receipt"
                            aria-label="Print receipt"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVoidSale(sale.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 cursor-pointer"
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

      {/* -------------------------------------------------------------
          Thermal POS Cashier Receipt (Visible ONLY during print)
         ------------------------------------------------------------- */}
      {completedSale && (
        <div
          id="printable-receipt"
          className="hidden print:block text-black bg-white font-mono text-[11px] leading-tight select-text w-[76mm] mx-auto p-2"
        >
          {/* Shop Header Details */}
          <div className="text-center font-bold space-y-0.5 mb-1">
            <h2 className="text-sm font-black tracking-wider uppercase">
              THEJANI TRADERS
            </h2>
            <p className="text-[10px]">Sales Counter & Warehouse</p>
            <p className="text-[10px]">Tel: 077-1234567 | Colombo, Sri Lanka</p>
          </div>

          <div className="border-b border-dashed border-black my-1.5" />

          {/* Receipt Info */}
          <div className="text-[10px] space-y-0.5">
            <div className="flex justify-between font-bold">
              <span>RECEIPT #: {completedSale.id}</span>
              <span>POS: #01</span>
            </div>
            <div className="flex justify-between text-[9px] text-gray-800">
              <span>Date: {completedSale.date_time || new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>Cashier: {completedSale.user?.name || user?.name || "Cashier"}</span>
            </div>
          </div>

          <div className="border-b border-black my-1.5" />

          {/* Purchased Items Table */}
          <table className="w-full text-left text-[10px] mb-1">
            <thead>
              <tr className="border-b border-black text-[9px] uppercase font-bold">
                <th className="py-0.5">ITEM</th>
                <th className="py-0.5 text-center">QTY</th>
                <th className="py-0.5 text-right">PRICE</th>
                <th className="py-0.5 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {completedSale.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-dashed border-gray-300">
                  <td className="py-1 pr-1 break-words font-medium">
                    {item.product?.name || item.product_name || "Product"}
                  </td>
                  <td className="py-1 text-center font-bold">{item.qty}</td>
                  <td className="py-1 text-right">
                    {formatCurrency(Number(item.retail_price || item.unit_price))}
                  </td>
                  <td className="py-1 text-right font-bold">
                    {formatCurrency(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-black my-1.5" />

          {/* Totals & Breakdown */}
          <div className="space-y-1 text-right text-[10px]">
            <div className="flex justify-between">
              <span>Gross Subtotal:</span>
              <span>
                {formatCurrency(
                  Number(completedSale.total) + Number(completedSale.discount || 0)
                )}
              </span>
            </div>

            {Number(completedSale.discount) > 0 && (
              <div className="flex justify-between text-gray-800">
                <span>Discount:</span>
                <span>- {formatCurrency(Number(completedSale.discount))}</span>
              </div>
            )}

            <div className="flex justify-between text-xs font-black border-t border-b border-black py-1 my-1">
              <span>NET TOTAL:</span>
              <span>{formatCurrency(Number(completedSale.total))}</span>
            </div>

            <div className="flex justify-between">
              <span>Paid ({completedSale.payment_type?.toUpperCase() || "CASH"}):</span>
              <span>
                {formatCurrency(
                  Number(completedSale.cashTendered || completedSale.total)
                )}
              </span>
            </div>

            {completedSale.changeDue !== undefined && Number(completedSale.changeDue) > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change Due:</span>
                <span>{formatCurrency(Number(completedSale.changeDue))}</span>
              </div>
            )}

            <div className="flex justify-between text-[9px] text-gray-600 pt-0.5">
              <span>Items: {completedSale.items?.length || 0}</span>
              <span>
                Total Units:{" "}
                {completedSale.items?.reduce(
                  (sum: number, it: any) => sum + (Number(it.qty) || 0),
                  0
                ) || 0}
              </span>
            </div>
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Receipt Footer */}
          <div className="text-center text-[10px] space-y-0.5">
            <p className="font-bold">THANK YOU FOR SHOPPING WITH US!</p>
            <p className="text-[9px]">Exchange possible within 7 days with bill.</p>
            <p className="text-[8px] text-gray-500 mt-1">*** HAVE A GREAT DAY ***</p>
          </div>
        </div>
      )}
    </>
  );
};

export default PosTerminal;
