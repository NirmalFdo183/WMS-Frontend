import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

interface Product {
  id: number;
  material_code: string;
  barcode: string;
  name: string;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
  shelf_stock?: number;
  pending_stock?: number;
  total_units?: number;
  created_at?: string;
  updated_at?: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface BatchStock {
  id: number;
  product_id: number;
  supplier_invoice_id: number;
  no_cases: number;
  pack_size: number;
  extra_units: number;
  remain_qty: number;
  retail_price: number;
  netprice: number;
  expiry_date: string | null;
  supplier_invoice?: {
    id: number;
    invoice_number: string;
    invoice_date: string;
  };
}

interface FieldErrors {
  material_code?: string;
  barcode?: string;
  name?: string;
  supplier_id?: string;
}

interface ToastNotification {
  text: string;
  type: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

type StockFilterType = "all" | "in_stock" | "low_stock" | "out_of_stock";

const PAGE_SIZE = 15;

const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilterType>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [groupBySupplier, setGroupBySupplier] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add / Edit Modal state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    material_code: "",
    barcode: "",
    name: "",
    supplier_id: "",
  });
  const [initialFormData, setInitialFormData] = useState({
    material_code: "",
    barcode: "",
    name: "",
    supplier_id: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dialogGeneralError, setDialogGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // View Stock Details Modal state
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [stockBatches, setStockBatches] = useState<BatchStock[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const activeViewProductIdRef = useRef<number | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus management refs
  const addProductBtnRef = useRef<HTMLButtonElement>(null);
  const modalFirstInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);
  const addEditModalRef = useRef<HTMLDivElement>(null);
  const viewStockModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type, action });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [prodRes, suppRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`),
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setSuppliers(Array.isArray(suppRes.data) ? suppRes.data : []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setFetchError("Unable to load inventory data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Stock calculations for a product
  const getProductStockMetrics = (prod: Product) => {
    const shelfStock = prod.shelf_stock ?? 0;
    const pendingStock = prod.pending_stock ?? 0;
    const totalAvailable = shelfStock + pendingStock;

    let statusKey: StockFilterType = "in_stock";
    let statusLabel = "In stock";

    if (totalAvailable === 0) {
      statusKey = "out_of_stock";
      statusLabel = "Out of stock";
    } else if (totalAvailable <= 50) {
      statusKey = "low_stock";
      statusLabel = "Low stock";
    }

    const isWarehouseEmpty = shelfStock === 0 && pendingStock > 0;

    return {
      shelfStock,
      pendingStock,
      totalAvailable,
      statusKey,
      statusLabel,
      isWarehouseEmpty,
    };
  };

  // Global summary metrics (always over the entire directory)
  const globalMetrics = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      const { statusKey } = getProductStockMetrics(p);
      if (statusKey === "in_stock") inStock++;
      else if (statusKey === "low_stock") lowStock++;
      else if (statusKey === "out_of_stock") outOfStock++;
    });

    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products]);

  // Handle filter changes (resets pagination to page 1)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (filter: StockFilterType) => {
    setStockFilter(filter);
    setCurrentPage(1);
  };

  const handleSupplierFilterChange = (suppId: string) => {
    setSupplierFilter(suppId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
    setSupplierFilter("all");
    setCurrentPage(1);
  };

  // Filter products across the complete dataset
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return products.filter((p) => {
      // Stock Status filter
      if (stockFilter !== "all") {
        const { statusKey } = getProductStockMetrics(p);
        if (statusKey !== stockFilter) return false;
      }

      // Supplier filter
      if (supplierFilter !== "all") {
        if (String(p.supplier_id) !== supplierFilter) return false;
      }

      // Text search: name, material_code, barcode, supplier name
      if (q) {
        const nameMatch = p.name.toLowerCase().includes(q);
        const codeMatch = p.material_code.toLowerCase().includes(q);
        const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        const suppMatch = p.supplier?.name
          ? p.supplier.name.toLowerCase().includes(q)
          : false;

        if (!nameMatch && !codeMatch && !barcodeMatch && !suppMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, stockFilter, supplierFilter]);

  // Grouping by actual Supplier relationship
  const groupedProducts = useMemo(() => {
    if (!groupBySupplier) return null;

    const map = new Map<string, Product[]>();

    filteredProducts.forEach((p) => {
      const groupName = p.supplier?.name || "Unassigned Supplier";
      if (!map.has(groupName)) {
        map.set(groupName, []);
      }
      map.get(groupName)!.push(p);
    });

    // Sort groups alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts, groupBySupplier]);

  // Pagination calculations (flat mode only)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    if (groupBySupplier) return filteredProducts;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredProducts, currentPage, groupBySupplier]);

  // Check if Add/Edit form is modified
  const isFormDirty = useMemo(() => {
    return (
      formData.material_code.trim() !== initialFormData.material_code.trim() ||
      formData.barcode.trim() !== initialFormData.barcode.trim() ||
      formData.name.trim() !== initialFormData.name.trim() ||
      formData.supplier_id !== initialFormData.supplier_id
    );
  }, [formData, initialFormData]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    triggerElementRef.current = addProductBtnRef.current;
    setEditingProduct(null);
    const emptyForm = {
      material_code: "",
      barcode: "",
      name: "",
      supplier_id: suppliers.length > 0 ? String(suppliers[0].id) : "",
    };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFieldErrors({});
    setDialogGeneralError(null);
    setShowDiscardConfirm(false);
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (
    product: Product,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    triggerElementRef.current = e.currentTarget;
    setEditingProduct(product);
    const populated = {
      material_code: product.material_code,
      barcode: product.barcode || "",
      name: product.name,
      supplier_id: String(product.supplier_id),
    };
    setFormData(populated);
    setInitialFormData(populated);
    setFieldErrors({});
    setDialogGeneralError(null);
    setShowDiscardConfirm(false);
    setShowAddEditModal(true);
  };

  // Safe closing of Add/Edit dialog with dirty confirmation
  const handleRequestCloseAddEdit = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      closeAddEditModal();
    }
  };

  const closeAddEditModal = () => {
    setShowAddEditModal(false);
    setShowDiscardConfirm(false);
    setEditingProduct(null);
    setFieldErrors({});
    setDialogGeneralError(null);

    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 50);
  };

  // Open View Stock Modal
  const handleOpenViewStock = async (
    product: Product,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    triggerElementRef.current = e.currentTarget;
    setViewingProduct(product);
    setStockBatches([]);
    setStockLoading(true);
    setStockError(null);
    activeViewProductIdRef.current = product.id;

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/batch-stocks/product/${product.id}`,
      );

      // Protect against race conditions: only apply if this product is still active
      if (activeViewProductIdRef.current === product.id) {
        setStockBatches(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: any) {
      console.error("Error loading batch stocks:", err);
      if (activeViewProductIdRef.current === product.id) {
        setStockError("Unable to load stock batches. Please try again.");
      }
    } finally {
      if (activeViewProductIdRef.current === product.id) {
        setStockLoading(false);
      }
    }
  };

  const closeViewStockModal = () => {
    activeViewProductIdRef.current = null;
    setViewingProduct(null);
    setStockBatches([]);
    setStockError(null);

    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 50);
  };

  // Open Delete Modal
  const handleOpenDelete = (
    product: Product,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    triggerElementRef.current = e.currentTarget;
    setDeleteTarget(product);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
    setDeleting(false);

    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 50);
  };

  // Autofocus when Add/Edit opens
  useEffect(() => {
    if (showAddEditModal) {
      setTimeout(() => {
        modalFirstInputRef.current?.focus();
      }, 50);
    }
  }, [showAddEditModal]);

  // Autofocus Cancel when Delete opens
  useEffect(() => {
    if (deleteTarget) {
      setTimeout(() => {
        cancelDeleteBtnRef.current?.focus();
      }, 50);
    }
  }, [deleteTarget]);

  // Focus trap & Escape for Add/Edit Modal
  useEffect(() => {
    if (!showAddEditModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestCloseAddEdit();
        return;
      }

      if (e.key === "Tab") {
        const modal = addEditModalRef.current;
        if (!modal) return;
        const focusables = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddEditModal, isFormDirty]);

  // Focus trap & Escape for View Stock Modal
  useEffect(() => {
    if (!viewingProduct) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeViewStockModal();
        return;
      }

      if (e.key === "Tab") {
        const modal = viewStockModalRef.current;
        if (!modal) return;
        const focusables = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingProduct]);

  // Focus trap & Escape for Delete Modal
  useEffect(() => {
    if (!deleteTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDeleteModal();
        return;
      }

      if (e.key === "Tab") {
        const modal = deleteModalRef.current;
        if (!modal) return;
        const focusables = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget]);

  // Submit Add/Edit form
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setFieldErrors({});
    setDialogGeneralError(null);

    const errors: FieldErrors = {};
    if (!formData.material_code.trim()) {
      errors.material_code = "Material code is required";
    }
    if (!formData.barcode.trim()) {
      errors.barcode = "Barcode is required";
    }
    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    }
    if (!formData.supplier_id) {
      errors.supplier_id = "Please select a supplier";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    const payload = {
      material_code: formData.material_code.trim(),
      barcode: formData.barcode.trim(),
      name: formData.name.trim(),
      supplier_id: Number(formData.supplier_id),
    };

    try {
      if (editingProduct) {
        const res = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/products/${editingProduct.id}`,
          payload,
        );
        const updated: Product = res.data;

        // Preserve existing calculated stocks
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...updated,
                  shelf_stock: p.shelf_stock,
                  pending_stock: p.pending_stock,
                  total_units: p.total_units,
                  supplier:
                    suppliers.find((s) => s.id === updated.supplier_id) ||
                    p.supplier,
                }
              : p,
          ),
        );

        showToast(`Product "${updated.name}" updated successfully.`);
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/products`,
          payload,
        );
        const created: Product = res.data;

        const newProd: Product = {
          ...created,
          shelf_stock: 0,
          pending_stock: 0,
          total_units: 0,
          supplier: suppliers.find((s) => s.id === created.supplier_id),
        };

        setProducts((prev) => [newProd, ...prev]);
        showToast(`Product "${newProd.name}" added successfully.`);
      }

      closeAddEditModal();
    } catch (err: any) {
      console.error("Error saving product:", err);

      if (err.response?.status === 422 && err.response.data?.errors) {
        const serverErrors = err.response.data.errors;
        const newErrs: FieldErrors = {};
        if (serverErrors.material_code) {
          newErrs.material_code = serverErrors.material_code[0];
        }
        if (serverErrors.barcode) {
          newErrs.barcode = serverErrors.barcode[0];
        }
        if (serverErrors.name) {
          newErrs.name = serverErrors.name[0];
        }
        if (serverErrors.supplier_id) {
          newErrs.supplier_id = serverErrors.supplier_id[0];
        }
        setFieldErrors(newErrs);
        setDialogGeneralError("Please resolve the field errors indicated below.");
      } else if (!err.response) {
        setDialogGeneralError(
          "Unable to connect to the server. Please check your connection.",
        );
      } else {
        setDialogGeneralError(
          err.response.data?.message || "Failed to save product. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Safe delete execution
  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/products/${deleteTarget.id}`,
      );

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast(`Product ${deleteTarget.material_code} deleted successfully.`);
      closeDeleteModal();
    } catch (err: any) {
      console.error("Error deleting product:", err);

      if (err.response?.status === 409 || err.response?.status === 500) {
        setDeleteError(
          "Cannot delete product because active stock batches, sales history, or delivery records exist.",
        );
      } else if (!err.response) {
        setDeleteError("Unable to connect. Please try again.");
      } else {
        setDeleteError(
          err.response.data?.message ||
            "Failed to delete product. Please try again.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  // Format expiry status with precise conditions
  const getExpiryDisplay = (expiryDateStr: string | null) => {
    if (!expiryDateStr) {
      return {
        label: "Not recorded",
        className: "text-slate-400 font-medium",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        label: `Expired (${expiryDateStr})`,
        className: "text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs font-semibold",
      };
    } else if (diffDays === 0) {
      return {
        label: `Expires today (${expiryDateStr})`,
        className: "text-red-800 bg-red-100 border border-red-300 px-2 py-0.5 rounded text-xs font-bold",
      };
    } else if (diffDays <= 30) {
      return {
        label: `Expiring soon (${diffDays}d · ${expiryDateStr})`,
        className: "text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold",
      };
    }

    return {
      label: expiryDateStr,
      className: "text-slate-700 font-mono text-sm",
    };
  };

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + paginatedProducts.length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-[#f8f9fa] text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[100] max-w-md p-4 rounded-xl border shadow-lg flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          )}
          <div className="flex-1 text-sm font-medium">{toast.text}</div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            aria-label="Close notification"
            className="p-1 rounded-md hover:bg-black/10 transition-colors opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Inventory Management
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage product master catalog, stock levels, and warehouse batch tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            title="Refresh product list"
            aria-label="Refresh product list"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-200 bg-white text-slate-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-700" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            ref={addProductBtnRef}
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold shadow-xs transition-colors focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Global Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <button
          onClick={() => handleStockFilterChange("all")}
          className={`p-4 rounded-xl border text-left transition-all ${
            stockFilter === "all"
              ? "bg-white border-teal-700 ring-2 ring-teal-700/20 shadow-xs"
              : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 mb-1">
            Total in directory
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-bold text-slate-900">
              {loading ? "—" : globalMetrics.total}
            </span>
            <span className="text-xs font-medium text-slate-400">products</span>
          </div>
        </button>

        {/* In Stock */}
        <button
          onClick={() => handleStockFilterChange("in_stock")}
          className={`p-4 rounded-xl border text-left transition-all ${
            stockFilter === "in_stock"
              ? "bg-white border-teal-700 ring-2 ring-teal-700/20 shadow-xs"
              : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Stock level normal
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-bold text-emerald-700">
              {loading ? "—" : globalMetrics.inStock}
            </span>
            <span className="text-xs font-medium text-emerald-600/70">&gt; 50 units</span>
          </div>
        </button>

        {/* Low Stock */}
        <button
          onClick={() => handleStockFilterChange("low_stock")}
          className={`p-4 rounded-xl border text-left transition-all ${
            stockFilter === "low_stock"
              ? "bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Low stock threshold
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-bold text-amber-700">
              {loading ? "—" : globalMetrics.lowStock}
            </span>
            <span className="text-xs font-medium text-amber-600/70">≤ 50 units</span>
          </div>
        </button>

        {/* Out of Stock */}
        <button
          onClick={() => handleStockFilterChange("out_of_stock")}
          className={`p-4 rounded-xl border text-left transition-all ${
            stockFilter === "out_of_stock"
              ? "bg-white border-red-600 ring-2 ring-red-500/20 shadow-xs"
              : "bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs"
          }`}
        >
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Critically empty
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-bold text-red-600">
              {loading ? "—" : globalMetrics.outOfStock}
            </span>
            <span className="text-xs font-medium text-red-600/70">0 units</span>
          </div>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="product-search"
              aria-label="Search products"
              placeholder="Search by product name, material code, barcode, or supplier..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-stone-200 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Stock status filter dropdown */}
            <select
              aria-label="Filter by stock status"
              value={stockFilter}
              onChange={(e) => handleStockFilterChange(e.target.value as StockFilterType)}
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              <option value="all">All stock statuses</option>
              <option value="in_stock">In stock (&gt; 50)</option>
              <option value="low_stock">Low stock (1 – 50)</option>
              <option value="out_of_stock">Out of stock (0)</option>
            </select>

            {/* Supplier filter dropdown */}
            <select
              aria-label="Filter by supplier"
              value={supplierFilter}
              onChange={(e) => handleSupplierFilterChange(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              <option value="all">All suppliers ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Group by Supplier Toggle */}
            <button
              onClick={() => setGroupBySupplier(!groupBySupplier)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                groupBySupplier
                  ? "bg-teal-50 border-teal-300 text-teal-900"
                  : "bg-white border-stone-200 text-slate-700 hover:bg-stone-50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Group by supplier</span>
            </button>

            {/* Clear Filters button */}
            {(searchQuery || stockFilter !== "all" || supplierFilter !== "all") && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-sm font-medium text-teal-800 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Filter status readout */}
        <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-stone-100">
          <div>
            Showing <strong className="text-slate-700">{filteredProducts.length}</strong> of{" "}
            {products.length} products
            {stockFilter !== "all" && (
              <span className="ml-1 text-teal-800 font-medium">
                · Filtered by {stockFilter.replace("_", " ")}
              </span>
            )}
            {supplierFilter !== "all" && (
              <span className="ml-1 text-teal-800 font-medium">
                · Filtered by {suppliers.find((s) => String(s.id) === supplierFilter)?.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">
            Loading products and stock levels...
          </p>
        </div>
      ) : fetchError ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Failed to load products</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{fetchError}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-semibold rounded-lg transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-16 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {searchQuery || stockFilter !== "all" || supplierFilter !== "all"
              ? "No products match your current search and filter criteria. Try clearing filters."
              : "No products exist in your inventory yet. Add your first product to get started."}
          </p>
          {(searchQuery || stockFilter !== "all" || supplierFilter !== "all") ? (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 text-sm font-semibold rounded-lg transition"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold rounded-lg transition"
            >
              Add Product
            </button>
          )}
        </div>
      ) : groupBySupplier && groupedProducts ? (
        /* Grouped by actual Supplier relationship */
        <div className="space-y-6">
          {groupedProducts.map(([groupName, groupItems]) => (
            <div
              key={groupName}
              className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">
                    {groupName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-slate-700">
                    {groupItems.length} {groupItems.length === 1 ? "product" : "products"}
                  </span>
                </div>
              </div>

              {/* Group Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Barcode</th>
                      <th className="py-3 px-4 text-right">Warehouse Stock</th>
                      <th className="py-3 px-4 text-right">On Trucks</th>
                      <th className="py-3 px-4 text-right">Total Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {groupItems.map((prod) => {
                      const {
                        shelfStock,
                        pendingStock,
                        totalAvailable,
                        statusKey,
                        statusLabel,
                        isWarehouseEmpty,
                      } = getProductStockMetrics(prod);

                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{prod.name}</div>
                            <div className="font-mono text-xs text-slate-500 mt-0.5">
                              {prod.material_code}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-slate-600 select-all tracking-wider">
                              {prod.barcode || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-slate-900">
                              {shelfStock.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">units</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {pendingStock > 0 ? (
                              <span className="font-semibold text-amber-800">
                                {pendingStock.toLocaleString()}
                                <span className="text-xs text-amber-700/70 ml-1">units</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-slate-900">
                              {totalAvailable.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">units</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {isWarehouseEmpty && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                  Warehouse empty
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  statusKey === "in_stock"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : statusKey === "low_stock"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => handleOpenViewStock(prod, e)}
                                title="View batch stock details"
                                aria-label={`View stock details for ${prod.name}`}
                                className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleOpenEditModal(prod, e)}
                                title="Edit product"
                                aria-label={`Edit ${prod.name}`}
                                className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleOpenDelete(prod, e)}
                                title="Delete product"
                                aria-label={`Delete ${prod.name}`}
                                className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat Directory Table */
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Barcode</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-right">Warehouse Stock</th>
                  <th className="py-3.5 px-4 text-right">On Trucks</th>
                  <th className="py-3.5 px-4 text-right">Total Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedProducts.map((prod) => {
                  const {
                    shelfStock,
                    pendingStock,
                    totalAvailable,
                    statusKey,
                    statusLabel,
                    isWarehouseEmpty,
                  } = getProductStockMetrics(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        <div className="font-mono text-xs text-slate-500 mt-0.5">
                          {prod.material_code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-slate-600 select-all tracking-wider">
                          {prod.barcode || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium">
                          {prod.supplier?.name || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {shelfStock.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">units</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {pendingStock > 0 ? (
                          <span className="font-semibold text-amber-800">
                            {pendingStock.toLocaleString()}
                            <span className="text-xs text-amber-700/70 ml-1">units</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900">
                          {totalAvailable.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">units</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {isWarehouseEmpty && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                              Warehouse empty
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              statusKey === "in_stock"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : statusKey === "low_stock"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleOpenViewStock(prod, e)}
                            title="View batch stock details"
                            aria-label={`View stock details for ${prod.name}`}
                            className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEditModal(prod, e)}
                            title="Edit product"
                            aria-label={`Edit ${prod.name}`}
                            className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleOpenDelete(prod, e)}
                            title="Delete product"
                            aria-label={`Delete ${prod.name}`}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
              <div>
                Showing <strong className="text-slate-800">{startIndex + 1}</strong> to{" "}
                <strong className="text-slate-800">
                  {Math.min(endIndex, filteredProducts.length)}
                </strong>{" "}
                of <strong className="text-slate-800">{filteredProducts.length}</strong> products
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white text-slate-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-stone-200 rounded-lg">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white text-slate-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Stock Breakdown Modal (max-w-4xl wide dialog) */}
      {viewingProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-stock-title"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
        >
          <div
            ref={viewStockModalRef}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between bg-stone-50/80">
              <div>
                <h2 id="view-stock-title" className="text-lg font-bold text-slate-900">
                  Stock Breakdown: {viewingProduct.name}
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    Material Code:{" "}
                    <strong className="font-mono text-slate-700">
                      {viewingProduct.material_code}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Barcode:{" "}
                    <strong className="font-mono text-slate-700 select-all">
                      {viewingProduct.barcode || "—"}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Supplier:{" "}
                    <strong className="text-slate-700">
                      {viewingProduct.supplier?.name || "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <button
                onClick={closeViewStockModal}
                aria-label="Close stock breakdown dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Snapshot cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60">
                  <div className="text-xs text-slate-500 font-medium">Warehouse Stock</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {(viewingProduct.shelf_stock ?? 0).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60">
                  <div className="text-xs text-slate-500 font-medium">On-Truck Stock</div>
                  <div className="text-xl font-bold text-amber-800 mt-0.5">
                    {(viewingProduct.pending_stock ?? 0).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/50">
                  <div className="text-xs text-teal-800 font-medium">
                    Total System Stock (Wh + Trucks)
                  </div>
                  <div className="text-xl font-bold text-teal-950 mt-0.5">
                    {(
                      (viewingProduct.shelf_stock ?? 0) + (viewingProduct.pending_stock ?? 0)
                    ).toLocaleString()}{" "}
                    <span className="text-xs font-normal text-teal-700">units</span>
                  </div>
                </div>
              </div>

              {/* Batches Table */}
              <div>
                <div className="text-sm font-bold text-slate-900 mb-2">
                  Active Stock Batches ({stockBatches.length})
                </div>

                {stockLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-700 mx-auto mb-2" />
                    <span className="text-sm font-medium">Loading batch stock details...</span>
                  </div>
                ) : stockError ? (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    {stockError}
                  </div>
                ) : stockBatches.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-lg border border-stone-200 text-slate-500 text-sm">
                    No active stock batches recorded for this product in the warehouse.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Batch / Invoice Ref</th>
                          <th className="py-2.5 px-3 text-right">Available Qty</th>
                          <th className="py-2.5 px-3">Pack Breakdown</th>
                          <th className="py-2.5 px-3 text-right">Retail Price</th>
                          <th className="py-2.5 px-3 text-right">Net Cost</th>
                          <th className="py-2.5 px-3">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {stockBatches.map((batch) => {
                          const expiryInfo = getExpiryDisplay(batch.expiry_date);
                          const cases = batch.no_cases || 0;
                          const packSize = batch.pack_size || 0;
                          const loose = batch.extra_units || 0;

                          return (
                            <tr key={batch.id} className="hover:bg-stone-50/60">
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                <div>
                                  {batch.supplier_invoice?.invoice_number || `Batch #${batch.id}`}
                                </div>
                                {batch.supplier_invoice?.invoice_date && (
                                  <div className="text-xs text-slate-400">
                                    {batch.supplier_invoice.invoice_date}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {batch.remain_qty.toLocaleString()}
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                  units
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 font-mono">
                                {cases} cases × {packSize} + {loose} loose
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-800 font-medium">
                                Rs. {Number(batch.retail_price).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600">
                                Rs. {Number(batch.netprice).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={expiryInfo.className}>
                                  {expiryInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                onClick={closeViewStockModal}
                className="px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-slate-700 font-semibold text-sm rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal (max-w-[520px]) */}
      {showAddEditModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-dialog-title"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
        >
          <div
            ref={addEditModalRef}
            className="bg-white rounded-xl shadow-xl max-w-[520px] w-full border border-stone-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div>
                <h2 id="product-dialog-title" className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingProduct
                    ? `Update product details for ${editingProduct.material_code}`
                    : "Enter product catalog codes and assign a supplier"}
                </p>
              </div>
              <button
                onClick={handleRequestCloseAddEdit}
                aria-label="Close dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
              {/* General error alert */}
              {dialogGeneralError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{dialogGeneralError}</span>
                </div>
              )}

              {/* Discard confirmation box */}
              {showDiscardConfirm && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    Discard unsaved changes?
                  </div>
                  <p className="text-xs text-amber-800">
                    You have unsaved changes in this form. Are you sure you want to close?
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 rounded text-amber-900 hover:bg-amber-100/50"
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      onClick={closeAddEditModal}
                      className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Discard & Close
                    </button>
                  </div>
                </div>
              )}

              {/* Material Code field */}
              <div>
                <label
                  htmlFor="field-material-code"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Material Code <span className="text-red-600">*</span>
                </label>
                <input
                  ref={modalFirstInputRef}
                  id="field-material-code"
                  type="text"
                  value={formData.material_code}
                  onChange={(e) => {
                    setFormData({ ...formData, material_code: e.target.value });
                    if (fieldErrors.material_code) {
                      setFieldErrors({ ...fieldErrors, material_code: undefined });
                    }
                  }}
                  placeholder="e.g. MAT-001"
                  aria-invalid={!!fieldErrors.material_code}
                  aria-describedby={
                    fieldErrors.material_code ? "err-material-code" : undefined
                  }
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.material_code
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-300 focus:ring-teal-700/20 focus:border-teal-700"
                  }`}
                />
                {fieldErrors.material_code && (
                  <p id="err-material-code" className="text-xs text-red-600 mt-1 font-medium">
                    {fieldErrors.material_code}
                  </p>
                )}
              </div>

              {/* Barcode field */}
              <div>
                <label
                  htmlFor="field-barcode"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Barcode <span className="text-red-600">*</span>
                </label>
                <input
                  id="field-barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => {
                    setFormData({ ...formData, barcode: e.target.value });
                    if (fieldErrors.barcode) {
                      setFieldErrors({ ...fieldErrors, barcode: undefined });
                    }
                  }}
                  placeholder="e.g. 0479100010010"
                  aria-invalid={!!fieldErrors.barcode}
                  aria-describedby={fieldErrors.barcode ? "err-barcode" : undefined}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.barcode
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-300 focus:ring-teal-700/20 focus:border-teal-700"
                  }`}
                />
                {fieldErrors.barcode && (
                  <p id="err-barcode" className="text-xs text-red-600 mt-1 font-medium">
                    {fieldErrors.barcode}
                  </p>
                )}
              </div>

              {/* Product Name field */}
              <div>
                <label
                  htmlFor="field-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Product Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="field-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: undefined });
                    }
                  }}
                  placeholder="e.g. Anchor Full Cream Milk Powder 400g"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "err-name" : undefined}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.name
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-300 focus:ring-teal-700/20 focus:border-teal-700"
                  }`}
                />
                {fieldErrors.name && (
                  <p id="err-name" className="text-xs text-red-600 mt-1 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Supplier dropdown field */}
              <div>
                <label
                  htmlFor="field-supplier"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Supplier <span className="text-red-600">*</span>
                </label>
                <select
                  id="field-supplier"
                  value={formData.supplier_id}
                  onChange={(e) => {
                    setFormData({ ...formData, supplier_id: e.target.value });
                    if (fieldErrors.supplier_id) {
                      setFieldErrors({ ...fieldErrors, supplier_id: undefined });
                    }
                  }}
                  aria-invalid={!!fieldErrors.supplier_id}
                  aria-describedby={fieldErrors.supplier_id ? "err-supplier" : undefined}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 focus:outline-none focus:ring-2 ${
                    fieldErrors.supplier_id
                      ? "border-red-400 focus:ring-red-200"
                      : "border-stone-300 focus:ring-teal-700/20 focus:border-teal-700"
                  }`}
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.supplier_id && (
                  <p id="err-supplier" className="text-xs text-red-600 mt-1 font-medium">
                    {fieldErrors.supplier_id}
                  </p>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRequestCloseAddEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingProduct ? "Save Changes" : "Create Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Cancel focused first) */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
        >
          <div
            ref={deleteModalRef}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-stone-200 text-left space-y-4"
          >
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
                Delete Product
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Are you sure you want to delete{" "}
                <strong className="text-slate-900 font-semibold">{deleteTarget.name}</strong>{" "}
                (Code: <code className="text-xs font-mono">{deleteTarget.material_code}</code>)?
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                This action cannot be undone. If this product has related batch stocks or sales
                records, deletion will be safely rejected.
              </p>
            </div>

            {/* Error message */}
            {deleteError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition focus:ring-2 focus:ring-stone-400 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
