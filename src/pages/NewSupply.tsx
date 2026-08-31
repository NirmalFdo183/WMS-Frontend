import React, { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Package,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  Check,
  RotateCcw,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
}

interface Supplier {
  id: number;
  name: string;
  contactno: string;
  address: string;
}

interface BatchItem {
  temp_id: number;
  product_id: number;
  product_name: string;
  material_code: string;
  barcode: string;
  no_cases: number;
  pack_size: number;
  extra_units: number;
  qty: number;
  free_qty: number;
  retail_price: number;
  netprice: number;
  expiry_date: string;
}

const formatCurrency = (amount: number): string => {
  const safe = isNaN(amount) ? 0 : amount;
  return `LKR ${safe.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const NewSupply: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editInvoiceId = location.state?.invoiceId;

  // Navigation & Warehouse Context
  const { refreshTotalValue } = useWarehouse();
  const [step, setStep] = useState<"invoice" | "items">("invoice");
  const [originalInvoiceTotal, setOriginalInvoiceTotal] = useState<number>(0);

  // Invoice State
  const [invoiceData, setInvoiceData] = useState({
    supplier_id: "",
    supplier_name: "",
    invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    total_bill_amount: "",
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Items State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Batch Entry State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [batchForm, setBatchForm] = useState({
    no_cases: "",
    pack_size: "",
    extra_units: "0",
    free_qty: "0",
    retail_price: "",
    net_price: "",
    expiry_date: "",
  });

  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for scanner support
  useEffect(() => {
    if (
      step === "items" &&
      !activeProduct &&
      !showAddProductModal &&
      !showConfirmSave &&
      !showConfirmCancel
    ) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    activeProduct,
    showAddProductModal,
    showConfirmSave,
    showConfirmCancel,
  ]);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, suppRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`),
      ]);
      setProducts(prodRes.data);
      setSuppliers(suppRes.data);

      // If editing, fetch invoice details
      if (editInvoiceId) {
        const invRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${editInvoiceId}`
        );
        const inv = invRes.data;

        setInvoiceData({
          supplier_id: inv.supplier_id.toString(),
          supplier_name: inv.supplier?.name || "",
          invoice_no: inv.invoice_number,
          invoice_date: inv.invoice_date,
          total_bill_amount: inv.total_bill_amount.toString(),
        });
        setOriginalInvoiceTotal(inv.total_bill_amount);

        const items = inv.batch_stocks.map((bs: any) => ({
          temp_id: bs.id,
          product_id: bs.product_id,
          product_name: bs.product?.name || "Unknown Product",
          material_code: bs.product?.material_code || "",
          barcode: bs.product?.barcode || "",
          no_cases: bs.no_cases,
          pack_size: bs.pack_size,
          extra_units: bs.extra_units || 0,
          qty: bs.remain_qty,
          free_qty: bs.free_qty || 0,
          retail_price: bs.retail_price,
          netprice: bs.netprice,
          expiry_date: bs.expiry_date || "",
        }));

        setBatchItems(items);
        setStep("items");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const directMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()) ||
        p.material_code.toLowerCase() === searchTerm.toLowerCase()
    );

    if (directMatch) {
      handleSelectProduct(directMatch);
      setSearchTerm("");
      return;
    }

    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode &&
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(filtered);
    setHighlightedIndex(-1);
  }, [searchTerm, products]);

  const handleSelectProduct = (product: Product) => {
    setActiveProduct(product);
    setSearchResults([]);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelectProduct(searchResults[highlightedIndex]);
      } else if (searchResults.length === 1) {
        handleSelectProduct(searchResults[0]);
      } else if (searchResults.length === 0 && searchTerm.trim().length > 0) {
        setNewProduct({
          ...newProduct,
          name: isNaN(Number(searchTerm)) ? searchTerm : "",
          material_code: searchTerm,
          barcode: searchTerm,
          supplier_id: Number(invoiceData.supplier_id) || 0,
        });
        setShowAddProductModal(true);
        setSearchTerm("");
      }
    } else if (e.key === "Escape") {
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  };

  const handleProceedToItems = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceData.supplier_id || !invoiceData.invoice_no) {
      alert("Please fill in the required invoice details.");
      return;
    }
    setOriginalInvoiceTotal(Number(invoiceData.total_bill_amount || 0));
    setStep("items");
  };

  // Enter key handler inside batch entry modal
  const handleBatchFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;
      const inputs = Array.from(
        form.querySelectorAll("input, select, textarea")
      ) as HTMLElement[];
      const idx = inputs.indexOf(e.currentTarget);
      if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    }
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    const cases = Number(batchForm.no_cases || 0);
    const pSize = Number(batchForm.pack_size || 0);
    const extras = Number(batchForm.extra_units || 0);
    const freeQty = Number(batchForm.free_qty || 0);
    const qty = cases * pSize + extras + freeQty;

    if (qty === 0 && freeQty === 0) {
      alert("Please enter at least a quantity or free quantity.");
      return;
    }

    const itemData: BatchItem = {
      temp_id: editingItemId || Date.now(),
      product_id: activeProduct.id,
      product_name: activeProduct.name,
      material_code: activeProduct.material_code,
      barcode: activeProduct.barcode || "",
      no_cases: cases,
      pack_size: pSize,
      extra_units: extras,
      qty: qty,
      free_qty: freeQty,
      retail_price: Number(batchForm.retail_price) || 0,
      netprice: Number(batchForm.net_price) || 0,
      expiry_date: batchForm.expiry_date,
    };

    if (editingItemId) {
      setBatchItems(
        batchItems.map((i) => (i.temp_id === editingItemId ? itemData : i))
      );
    } else {
      setBatchItems([...batchItems, itemData]);
    }

    setActiveProduct(null);
    setEditingItemId(null);
    setBatchForm({
      no_cases: "",
      pack_size: "",
      extra_units: "0",
      free_qty: "0",
      retail_price: "",
      net_price: "",
      expiry_date: "",
    });
  };

  const handleEditItem = (item: BatchItem) => {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return;

    setActiveProduct(product);
    setEditingItemId(item.temp_id);
    setBatchForm({
      no_cases: item.no_cases.toString(),
      pack_size: item.pack_size.toString(),
      extra_units: (item.extra_units || 0).toString(),
      free_qty: (item.free_qty || 0).toString(),
      retail_price: item.retail_price.toString(),
      net_price: item.netprice.toString(),
      expiry_date: item.expiry_date || "",
    });
  };

  const handleRemoveItem = (id: number) => {
    setBatchItems(batchItems.filter((i) => i.temp_id !== id));
  };

  const handleCompleteSupply = async () => {
    setLoading(true);
    try {
      const payload = {
        supplier_id: Number(invoiceData.supplier_id),
        invoice_number: invoiceData.invoice_no,
        invoice_date: invoiceData.invoice_date,
        total_bill_amount: Number(originalInvoiceTotal),
        items: batchItems.map((item) => ({
          product_id: item.product_id,
          no_cases: item.no_cases,
          pack_size: item.pack_size,
          extra_units: item.extra_units,
          qty: item.qty,
          free_qty: item.free_qty,
          retail_price: item.retail_price,
          netprice: item.netprice,
          expiry_date: item.expiry_date || null,
        })),
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/supplies`,
        payload
      );

      await refreshTotalValue();
      alert("Supply record successfully saved.");
      resetForm();
      navigate("/supply-invoices", { state: { activeTab: "supply" } });
    } catch (err: any) {
      console.error("Supply save error:", err);
      alert(err.response?.data?.message || "Failed to save supply record.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("invoice");
    setInvoiceData({
      supplier_id: "",
      supplier_name: "",
      invoice_no: "",
      invoice_date: new Date().toISOString().split("T")[0],
      total_bill_amount: "",
    });
    setBatchItems([]);
    setEditingItemId(null);
    setActiveProduct(null);
    setShowConfirmCancel(false);
    setShowConfirmSave(false);
    setOriginalInvoiceTotal(0);
  };

  const getItemsTotal = () => {
    return batchItems.reduce(
      (sum, item) => sum + (item.qty - (item.free_qty || 0)) * item.netprice,
      0
    );
  };

  const totalPaidUnits = batchItems.reduce(
    (sum, item) => sum + (item.qty - (item.free_qty || 0)),
    0
  );
  const totalFreeUnits = batchItems.reduce(
    (sum, item) => sum + (item.free_qty || 0),
    0
  );
  const totalUnits = batchItems.reduce((sum, item) => sum + item.qty, 0);

  const itemsTotal = getItemsTotal();
  const invoiceDiff = itemsTotal - originalInvoiceTotal;
  const isInvoiceMatched = Math.abs(invoiceDiff) < 0.01;
  const isInvoiceExceeded = invoiceDiff > 0.01;

  // New Product Modal State
  const [newProduct, setNewProduct] = useState({
    name: "",
    material_code: "",
    barcode: "",
    supplier_id: 0,
  });

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/products`,
        newProduct
      );
      setProducts([...products, res.data]);
      setShowAddProductModal(false);
      handleSelectProduct(res.data);
      setNewProduct({
        name: "",
        material_code: "",
        barcode: "",
        supplier_id: 0,
      });
    } catch (err) {
      console.error("Error creating product:", err);
      alert("Failed to create product.");
    }
  };

  // Calculations for active modal
  const modalCases = Number(batchForm.no_cases || 0);
  const modalPackSize = Number(batchForm.pack_size || 0);
  const modalExtras = Number(batchForm.extra_units || 0);
  const modalFree = Number(batchForm.free_qty || 0);
  const modalPaidQty = modalCases * modalPackSize + modalExtras;
  const modalTotalQty = modalPaidQty + modalFree;
  const modalNetPrice = Number(batchForm.net_price || 0);
  const modalLineTotal = modalPaidQty * modalNetPrice;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fa] text-slate-900 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                Stock Intake & Batching
              </span>
              {/* <span className="inline-flex items-center gap-1 bg-stone-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-stone-200 uppercase tracking-wide">
                {step === "invoice" ? "Step 1: Header" : "Step 2: Items"}
              </span> */}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              {editInvoiceId ? "Edit Supply Invoice" : "New Supply Entry"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Record incoming vendor invoices, verify stock batches and bill balances.
            </p>
          </div>

          {step === "items" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("invoice")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-700/40"
              >
                <ArrowLeft size={14} className="text-slate-500" />
                <span>Edit Header</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmCancel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-700/40"
              >
                <RotateCcw size={14} />
                <span>Discard</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmSave(true)}
                disabled={batchItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 transition-colors rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-1"
              >
                <Check size={14} />
                <span>Complete Invoice</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 1: Invoice Header Information */}
        {step === "invoice" ? (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Invoice Preliminary Information
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Specify the supplier, invoice number, and declared total amount
                </p>
              </div>
              <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Required
              </span>
            </div>

            <form onSubmit={handleProceedToItems} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Supplier Name
                  </label>
                  <div className="relative">
                    <Building2
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <select
                      className="w-full h-9 pl-9 pr-8 rounded-lg bg-white border border-stone-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors appearance-none"
                      value={invoiceData.supplier_id}
                      required
                      onChange={(e) => {
                        const selected = suppliers.find(
                          (s) => s.id.toString() === e.target.value
                        );
                        setInvoiceData({
                          ...invoiceData,
                          supplier_id: e.target.value,
                          supplier_name: selected ? selected.name : "",
                        });
                      }}
                    >
                      <option value="">Select a Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Invoice Number
                    </label>
                    <div className="relative">
                      <Hash
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="e.g. INV-2024-001"
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                        value={invoiceData.invoice_no}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            invoice_no: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                      Invoice Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                      <input
                        type="date"
                        required
                        className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                        value={invoiceData.invoice_date}
                        onChange={(e) =>
                          setInvoiceData({
                            ...invoiceData,
                            invoice_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Declared Bill Total (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full h-9 pl-10 pr-3 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
                      value={invoiceData.total_bill_amount}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          total_bill_amount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => navigate("/supply-invoices", { state: { activeTab: "supply" } })}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 active:bg-teal-950 transition-colors shadow-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-1"
                >
                  <span>{loading ? "Processing..." : "Proceed to Add Items"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 2: Items & Batch Management */
          <div className="space-y-4">
            {/* Header & KPI Summary Strip */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Supplier & Invoice metadata */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 mt-0.5">
                  <Building2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Supplier
                  </p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {invoiceData.supplier_name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Inv: #{invoiceData.invoice_no} | {invoiceData.invoice_date}
                  </p>
                </div>
              </div>

              {/* Units summary */}
              <div className="flex items-start gap-3 border-t sm:border-t-0 sm:border-l border-stone-200 sm:pl-4 pt-3 sm:pt-0">
                <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Items & Units
                  </p>
                  <p className="text-xs font-bold text-slate-900">
                    {batchItems.length} {batchItems.length === 1 ? "Product" : "Products"} | {totalUnits} Units
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Paid: {totalPaidUnits} | Free: {totalFreeUnits}
                  </p>
                </div>
              </div>

              {/* Declared Total */}
              <div className="border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-4 pt-3 lg:pt-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Declared Bill Total
                </p>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {formatCurrency(originalInvoiceTotal)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Target reconciliation
                </p>
              </div>

              {/* Stocked Items Total & Status */}
              <div className="border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-4 pt-3 lg:pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Calculated Total
                  </p>
                  {isInvoiceMatched ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 size={11} />
                      Matched
                    </span>
                  ) : isInvoiceExceeded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      <AlertCircle size={11} />
                      Exceeded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      <AlertTriangle size={11} />
                      Remaining
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm font-bold font-mono ${
                    isInvoiceMatched
                      ? "text-emerald-700"
                      : isInvoiceExceeded
                      ? "text-rose-600"
                      : "text-slate-900"
                  }`}
                >
                  {formatCurrency(itemsTotal)}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {isInvoiceMatched ? (
                    <span className="text-emerald-700">Balanced with bill</span>
                  ) : isInvoiceExceeded ? (
                    <span className="text-rose-600">
                      + {formatCurrency(Math.abs(invoiceDiff))} over declared
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      {formatCurrency(Math.abs(invoiceDiff))} remaining
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Product Barcode & Search Input */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-stone-200 relative">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full h-10 pl-10 pr-10 rounded-lg bg-white border border-stone-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors"
                  placeholder="Scan barcode or type product name / material code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto z-40">
                  {searchResults.map((p, index) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`px-3.5 py-2.5 cursor-pointer border-b border-stone-100 last:border-0 text-xs flex items-center justify-between transition-colors ${
                        highlightedIndex === index
                          ? "bg-teal-50 text-teal-900 font-semibold"
                          : "hover:bg-stone-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 w-28 text-center shrink-0">
                          {p.barcode || p.material_code}
                        </span>
                        <span className="font-medium text-slate-900">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {p.supplier?.name || "No Supplier"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Product Not Found Alert & Register CTA */}
              {searchTerm.trim().length > 0 && searchResults.length === 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-900">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>
                      Product <strong>"{searchTerm}"</strong> was not found in catalog.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProduct({
                        ...newProduct,
                        name: isNaN(Number(searchTerm)) ? searchTerm : "",
                        material_code: searchTerm,
                        barcode: searchTerm,
                        supplier_id: Number(invoiceData.supplier_id) || 0,
                      });
                      setShowAddProductModal(true);
                      setSearchTerm("");
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus size={13} />
                    <span>Register New Product</span>
                  </button>
                </div>
              )}
            </div>

            {/* Batch Items Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-stone-200">
                      <th className="px-4 py-2.5 w-10 text-center">#</th>
                      <th className="px-4 py-2.5">Product & Identifier</th>
                      <th className="px-4 py-2.5 text-center">Packaging Breakdown</th>
                      <th className="px-4 py-2.5 text-center">Total Units</th>
                      <th className="px-4 py-2.5 text-center">Free Qty</th>
                      <th className="px-4 py-2.5 text-right">Net Cost</th>
                      <th className="px-4 py-2.5 text-right">Retail Price</th>
                      <th className="px-4 py-2.5 text-right">Line Total</th>
                      <th className="px-4 py-2.5 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {batchItems.map((item, idx) => (
                      <tr
                        key={item.temp_id}
                        className="hover:bg-stone-50/70 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-900">
                            {item.product_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.barcode || item.material_code}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-[11px] text-slate-600">
                          {item.no_cases} × {item.pack_size}
                          {item.extra_units > 0 && (
                            <span className="text-teal-700 font-semibold ml-1">
                              + {item.extra_units} loose
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                          {item.qty}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {item.free_qty > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                              +{item.free_qty}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                          {formatCurrency(Number(item.netprice))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                          {formatCurrency(Number(item.retail_price))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(
                            (item.qty - (item.free_qty || 0)) * item.netprice
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              title="Edit item batch"
                              className="p-1 text-slate-500 hover:text-teal-800 hover:bg-stone-100 rounded transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.temp_id)}
                              title="Remove item"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {batchItems.length === 0 && (
                <div className="py-14 text-center px-4">
                  <Package
                    size={32}
                    className="mx-auto text-slate-300 mb-2"
                  />
                  <p className="text-xs font-semibold text-slate-700">
                    No batch items added yet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                    Scan an item barcode or use the search box above to add incoming stock batches
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Batch Stock Modal */}
      {activeProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  {editingItemId ? "Edit Stock Batch" : "Add Stock Batch"}
                </p>
                <h3 className="text-xs font-bold text-slate-900 truncate">
                  {activeProduct.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Code: {activeProduct.barcode || activeProduct.material_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveProduct(null);
                  setEditingItemId(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    No. of Cases
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    autoFocus
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.no_cases}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, no_cases: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Units / Pack
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.pack_size}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, pack_size: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Extra Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.extra_units}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        extra_units: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                    Free Qty (Bonus Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-8 px-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                    value={batchForm.free_qty}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        free_qty: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    className="w-full h-8 px-2 rounded-lg bg-white border border-stone-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.expiry_date}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, expiry_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Net Unit Cost (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.net_price}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, net_price: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                    Retail Price (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                    value={batchForm.retail_price}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        retail_price: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Live Preview Strip */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <p className="text-[10px] text-slate-500 font-sans uppercase font-semibold">
                    Units Total
                  </p>
                  <p className="font-bold text-slate-900">
                    {modalTotalQty} units{" "}
                    <span className="text-[10px] text-slate-500">
                      ({modalPaidQty} paid + {modalFree} free)
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-sans uppercase font-semibold">
                    Net Line Total
                  </p>
                  <p className="font-bold text-teal-900">
                    {formatCurrency(modalLineTotal)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProduct(null);
                    setEditingItemId(null);
                  }}
                  className="flex-1 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-teal-800 rounded-lg hover:bg-teal-900 active:bg-teal-950 transition-colors shadow-sm disabled:opacity-50"
                >
                  {editingItemId ? "Update Batch" : "Add to Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Save Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Finalize Supply Entry?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Saving will add {batchItems.length} product {batchItems.length === 1 ? "batch" : "batches"} totaling{" "}
              <strong>{formatCurrency(itemsTotal)}</strong> into warehouse stock.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="py-1.5 text-xs font-semibold text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteSupply}
                disabled={loading}
                className="py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 rounded-lg shadow-sm transition-colors"
              >
                {loading ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Discard Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm p-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Discard This Session?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All entered batch items for invoice #{invoiceData.invoice_no} will be cleared.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="py-1.5 text-xs font-semibold text-slate-700 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-sm transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/70 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Register New Product
                </h3>
                <p className="text-[11px] text-slate-500">
                  Quick registration into master catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddNewProduct} className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                  value={newProduct.barcode}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      barcode: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Material Code
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-8 px-2.5 rounded-lg bg-white border border-stone-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                  value={newProduct.material_code}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      material_code: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Supplier
                </label>
                <select
                  required
                  className="w-full h-8 px-2 rounded-lg bg-white border border-stone-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700"
                  value={newProduct.supplier_id}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      supplier_id: Number(e.target.value),
                    })
                  }
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 active:bg-teal-950 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSupply;
