import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  contactno: string | null;
  address: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FieldErrors {
  name?: string;
  contactno?: string;
  address?: string;
}

interface ToastNotification {
  text: string;
  type: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contactno: "",
    address: "",
  });
  const [initialFormData, setInitialFormData] = useState({
    name: "",
    contactno: "",
    address: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dialogGeneralError, setDialogGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Accessible Toast Notification
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus management refs
  const addSupplierBtnRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const deleteModalContainerRef = useRef<HTMLDivElement>(null);
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

  const fetchSuppliers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
      );
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
      setFetchError("Unable to load suppliers. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Filtered suppliers covering the entire dataset
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suppliers;

    const normalizedQ = q.replace(/[\s\-\(\)\+]/g, "");

    return suppliers.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const idStr = String(s.id);
      const formattedId = `sup-${idStr.padStart(3, "0")}`.toLowerCase();
      const idMatch = formattedId.includes(q) || idStr === q;

      const phone = s.contactno || "";
      const phoneMatch =
        phone.toLowerCase().includes(q) ||
        (normalizedQ.length > 2 &&
          phone.replace(/[\s\-\(\)\+]/g, "").includes(normalizedQ));

      return nameMatch || idMatch || phoneMatch;
    });
  }, [suppliers, searchQuery]);

  // Determine if form has unsaved modifications
  const isFormDirty = useMemo(() => {
    return (
      formData.name.trim() !== initialFormData.name.trim() ||
      formData.contactno.trim() !== initialFormData.contactno.trim() ||
      formData.address.trim() !== initialFormData.address.trim()
    );
  }, [formData, initialFormData]);

  // Open Add Dialog
  const handleOpenAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerElementRef.current = e.currentTarget;
    setEditingSupplier(null);
    const emptyForm = { name: "", contactno: "", address: "" };
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
    setFieldErrors({});
    setDialogGeneralError(null);
    setShowDiscardConfirm(false);
    setShowModal(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (
    supplier: Supplier,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    triggerElementRef.current = e.currentTarget;
    setEditingSupplier(supplier);
    const populated = {
      name: supplier.name,
      contactno: supplier.contactno || "",
      address: supplier.address || "",
    };
    setFormData(populated);
    setInitialFormData(populated);
    setFieldErrors({});
    setDialogGeneralError(null);
    setShowDiscardConfirm(false);
    setShowModal(true);
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (
    supplier: Supplier,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    triggerElementRef.current = e.currentTarget;
    setDeleteTarget(supplier);
    setDeleteError(null);
  };

  // Safe Dialog Closing with unsaved changes verification
  const handleRequestCloseModal = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      closeModal();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShowDiscardConfirm(false);
    setEditingSupplier(null);
    setFormData({ name: "", contactno: "", address: "" });
    setFieldErrors({});
    setDialogGeneralError(null);

    // Restore focus to trigger
    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 50);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
    setDeleting(false);

    // Restore focus to trigger
    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 50);
  };

  // Focus management when Add/Edit dialog opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [showModal]);

  // Focus management when Delete dialog opens
  useEffect(() => {
    if (deleteTarget) {
      setTimeout(() => {
        cancelDeleteBtnRef.current?.focus();
      }, 50);
    }
  }, [deleteTarget]);

  // Trap focus & handle Escape key inside Add/Edit modal
  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleRequestCloseModal();
        return;
      }

      if (e.key === "Tab") {
        const modal = modalContainerRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, isFormDirty]);

  // Trap focus & handle Escape key inside Delete modal
  useEffect(() => {
    if (!deleteTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDeleteModal();
        return;
      }

      if (e.key === "Tab") {
        const modal = deleteModalContainerRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setFieldErrors({});
    setDialogGeneralError(null);

    // Client-side validation matching backend rules
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFieldErrors({ name: "Supplier name is required" });
      nameInputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 255) {
      setFieldErrors({ name: "Supplier name cannot exceed 255 characters" });
      nameInputRef.current?.focus();
      return;
    }

    setSaving(true);
    const payload = {
      name: trimmedName,
      contactno: formData.contactno.trim() || null,
      address: formData.address.trim() || null,
    };

    try {
      if (editingSupplier) {
        const res = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/suppliers/${editingSupplier.id}`,
          payload,
        );
        const updatedSupplier: Supplier = res.data;

        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplier.id ? updatedSupplier : s)),
        );

        // Check if active search hides the updated supplier
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          updatedSupplier.name.toLowerCase().includes(q) ||
          `sup-${String(updatedSupplier.id).padStart(3, "0")}`.includes(q) ||
          (updatedSupplier.contactno &&
            updatedSupplier.contactno.toLowerCase().includes(q));

        if (matchesSearch) {
          showToast(`Supplier "${updatedSupplier.name}" updated successfully.`);
        } else {
          showToast(
            `Supplier "${updatedSupplier.name}" updated, but hidden by search filter.`,
            "info",
            {
              label: "Clear search",
              onClick: () => setSearchQuery(""),
            },
          );
        }
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
          payload,
        );
        const newSupplier: Supplier = res.data;

        setSuppliers((prev) => [...prev, newSupplier]);

        // Check if active search hides the new supplier
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          newSupplier.name.toLowerCase().includes(q) ||
          `sup-${String(newSupplier.id).padStart(3, "0")}`.includes(q) ||
          (newSupplier.contactno &&
            newSupplier.contactno.toLowerCase().includes(q));

        if (matchesSearch) {
          showToast(`Supplier "${newSupplier.name}" added successfully.`);
        } else {
          showToast(
            `Supplier "${newSupplier.name}" added, but hidden by search filter.`,
            "info",
            {
              label: "Clear search",
              onClick: () => setSearchQuery(""),
            },
          );
        }
      }

      closeModal();
    } catch (err: any) {
      console.error("Error saving supplier:", err);

      // Handle Laravel 422 JSON validation errors
      if (err.response?.status === 422 && err.response.data?.errors) {
        const serverErrors = err.response.data.errors;
        const newFieldErrors: FieldErrors = {};
        if (serverErrors.name) newFieldErrors.name = serverErrors.name[0];
        if (serverErrors.contactno)
          newFieldErrors.contactno = serverErrors.contactno[0];
        if (serverErrors.address)
          newFieldErrors.address = serverErrors.address[0];

        setFieldErrors(newFieldErrors);
        setDialogGeneralError("Please correct the errors indicated below.");
      } else if (!err.response) {
        setDialogGeneralError(
          "Unable to connect to the server. Please check your connection and try again.",
        );
      } else {
        setDialogGeneralError(
          err.response.data?.message ||
            "Failed to save supplier. Please try again.",
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
        `${import.meta.env.VITE_API_BASE_URL}/suppliers/${deleteTarget.id}`,
      );

      // Remove row only after server confirms
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast(
        `Supplier SUP-${String(deleteTarget.id).padStart(3, "0")} deleted successfully.`,
      );
      closeDeleteModal();
    } catch (err: any) {
      console.error("Error deleting supplier:", err);

      if (err.response?.status === 409 || err.response?.status === 500) {
        setDeleteError(
          "Cannot delete supplier because related invoices or supply records exist.",
        );
      } else if (!err.response) {
        setDeleteError("Unable to connect. Please try again.");
      } else {
        setDeleteError(
          err.response.data?.message ||
            "Failed to delete supplier. Please try again.",
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8f9fa] text-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl border shadow-lg flex items-center justify-between gap-3 text-sm animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : toast.type === "info"
                ? "bg-teal-50 border-teal-200 text-teal-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            )}
            <span className="font-medium">{toast.text}</span>
          </div>

          <div className="flex items-center gap-2">
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="underline text-xs font-semibold hover:text-teal-950 focus:outline-none focus:ring-1 focus:ring-teal-700 rounded px-1"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss message"
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Suppliers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage supplier details and contact information
            </p>
          </div>

          <button
            type="button"
            ref={addSupplierBtnRef}
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 shrink-0"
          >
            <Plus size={18} aria-hidden="true" />
            <span>Add supplier</span>
          </button>
        </div>

        {/* Toolbar: Search & Supplier Count */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID (e.g. SUP-001), or phone..."
              aria-label="Search suppliers"
              className="w-full h-10 pl-10 pr-10 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="text-xs sm:text-sm text-slate-600 font-medium sm:text-right shrink-0">
            {loading ? (
              <span>Loading suppliers…</span>
            ) : fetchError ? (
              <span className="text-red-600">Error loading data</span>
            ) : searchQuery.trim() ? (
              <span>
                Showing <strong className="text-slate-900">{filteredSuppliers.length}</strong> of{" "}
                {suppliers.length} {suppliers.length === 1 ? "supplier" : "suppliers"}
              </span>
            ) : (
              <span>
                Total <strong className="text-slate-900">{suppliers.length}</strong>{" "}
                {suppliers.length === 1 ? "supplier" : "suppliers"}
              </span>
            )}
          </div>
        </div>

        {/* Failure / Retry State */}
        {fetchError && !loading && (
          <div
            role="alert"
            className="bg-white border border-red-200 rounded-xl p-8 shadow-sm text-center"
          >
            <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">
              Unable to load suppliers
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={fetchSuppliers}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-slate-800 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading State: Skeleton Rows */}
        {loading && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
            <div className="h-4 bg-stone-200 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-stone-100 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        {!loading && !fetchError && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th scope="col" className="px-6 py-3.5">
                      Supplier
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Contact number
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Address
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSuppliers.map((supplier) => {
                    const formattedId = `SUP-${String(supplier.id).padStart(3, "0")}`;
                    return (
                      <tr
                        key={supplier.id}
                        className="hover:bg-stone-50/70 transition-colors"
                      >
                        {/* Supplier Name & ID */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                              {supplier.name}
                            </span>
                            <span className="text-xs font-mono text-slate-500 mt-0.5">
                              {formattedId}
                            </span>
                          </div>
                        </td>

                        {/* Contact Number */}
                        <td className="px-6 py-4">
                          {supplier.contactno ? (
                            <span className="font-mono text-sm text-slate-700 select-all">
                              {supplier.contactno}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>

                        {/* Address */}
                        <td className="px-6 py-4">
                          {supplier.address ? (
                            <p className="text-sm text-slate-600 break-words max-w-sm sm:max-w-md leading-relaxed">
                              {supplier.address}
                            </p>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(supplier, e)}
                              title={`Edit ${supplier.name}`}
                              aria-label={`Edit ${supplier.name}`}
                              className="p-2 text-slate-500 hover:text-teal-900 hover:bg-teal-50 rounded-lg border border-transparent hover:border-teal-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40"
                            >
                              <Edit2 size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDelete(supplier, e)}
                              title={`Delete ${supplier.name}`}
                              aria-label={`Delete ${supplier.name}`}
                              className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600/40"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty Filter State */}
                  {filteredSuppliers.length === 0 && suppliers.length > 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <Search
                            size={28}
                            className="text-slate-400 mb-2"
                            aria-hidden="true"
                          />
                          <p className="text-base font-semibold text-slate-900">
                            No suppliers match your search
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            No records found matching "{searchQuery}"
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="mt-3 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
                          >
                            Clear search
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Empty Directory State */}
                  {suppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-14 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-slate-400 mb-3">
                            <Plus size={24} />
                          </div>
                          <p className="text-base font-semibold text-slate-900">
                            No suppliers recorded yet
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            Get started by registering your first supplier.
                          </p>
                          <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700"
                          >
                            <Plus size={16} />
                            <span>Add supplier</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            // Protect against backdrop dismissal when dirty
            if (e.target === e.currentTarget) {
              handleRequestCloseModal();
            }
          }}
        >
          <div
            ref={modalContainerRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-[500px] border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
              <div>
                <h2
                  id="supplier-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingSupplier ? "Edit supplier" : "Add supplier"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {editingSupplier ? (
                    <>
                      Update details for{" "}
                      <span className="font-mono text-slate-700 font-semibold">
                        SUP-{String(editingSupplier.id).padStart(3, "0")}
                      </span>
                    </>
                  ) : (
                    "Enter the supplier’s business and contact details."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestCloseModal}
                aria-label="Close dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40"
              >
                <X size={20} />
              </button>
            </div>

            {/* General Error Banner */}
            {dialogGeneralError && (
              <div
                role="alert"
                aria-live="polite"
                className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm flex items-start gap-2"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{dialogGeneralError}</span>
              </div>
            )}

            {/* Unsaved Changes Warning Banner */}
            {showDiscardConfirm && (
              <div
                role="alert"
                className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span className="font-medium">
                    You have unsaved changes. Discard?
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded text-xs font-medium transition-colors"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium transition-colors"
                  >
                    Discard changes
                  </button>
                </div>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {/* Supplier Name */}
              <div>
                <label
                  htmlFor="supplier-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Supplier name <span className="text-red-500">*</span>
                </label>
                <input
                  id="supplier-name"
                  name="name"
                  type="text"
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  placeholder="e.g. Hemas Pharmaceuticals"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "supplier-name-error" : undefined
                  }
                  className={`w-full h-11 px-3.5 text-base text-slate-900 bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.name
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-stone-300 focus:border-teal-700 focus:ring-teal-700/20"
                  }`}
                />
                {fieldErrors.name && (
                  <p
                    id="supplier-name-error"
                    role="alert"
                    className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1"
                  >
                    <AlertCircle size={13} className="shrink-0" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label
                  htmlFor="supplier-contactno"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Contact number
                </label>
                <input
                  id="supplier-contactno"
                  name="contactno"
                  type="tel"
                  value={formData.contactno}
                  onChange={(e) => {
                    setFormData({ ...formData, contactno: e.target.value });
                    if (fieldErrors.contactno) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        contactno: undefined,
                      }));
                    }
                  }}
                  placeholder="e.g. 0112345678 or +94 77 123 4567"
                  aria-invalid={!!fieldErrors.contactno}
                  aria-describedby={
                    fieldErrors.contactno ? "supplier-contactno-error" : undefined
                  }
                  className={`w-full h-11 px-3.5 text-base text-slate-900 bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    fieldErrors.contactno
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-stone-300 focus:border-teal-700 focus:ring-teal-700/20"
                  }`}
                />
                {fieldErrors.contactno && (
                  <p
                    id="supplier-contactno-error"
                    role="alert"
                    className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1"
                  >
                    <AlertCircle size={13} className="shrink-0" />
                    {fieldErrors.contactno}
                  </p>
                )}
              </div>

              {/* Business Address */}
              <div>
                <label
                  htmlFor="supplier-address"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Business address
                </label>
                <textarea
                  id="supplier-address"
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    if (fieldErrors.address) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        address: undefined,
                      }));
                    }
                  }}
                  // Enter in address must create a newline, never submit the form
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Full street address, city, or postal code"
                  aria-invalid={!!fieldErrors.address}
                  aria-describedby={
                    fieldErrors.address ? "supplier-address-error" : undefined
                  }
                  className={`w-full p-3 text-base text-slate-900 bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 min-h-[90px] resize-y ${
                    fieldErrors.address
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-stone-300 focus:border-teal-700 focus:ring-teal-700/20"
                  }`}
                />
                {fieldErrors.address && (
                  <p
                    id="supplier-address-error"
                    role="alert"
                    className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1"
                  >
                    <AlertCircle size={13} className="shrink-0" />
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleRequestCloseModal}
                  disabled={saving}
                  className="px-4 py-2.5 border border-stone-200 text-slate-700 hover:bg-stone-50 active:bg-stone-100 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white rounded-lg text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{editingSupplier ? "Updating…" : "Saving…"}</span>
                    </>
                  ) : (
                    <span>
                      {editingSupplier ? "Update supplier" : "Save supplier"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              closeDeleteModal();
            }
          }}
        >
          <div
            ref={deleteModalContainerRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-[460px] border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3
                    id="delete-modal-title"
                    className="text-base font-bold text-slate-900"
                  >
                    Delete supplier
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Are you sure you want to delete{" "}
                    <strong className="text-slate-900 font-semibold">
                      SUP-{String(deleteTarget.id).padStart(3, "0")} —{" "}
                      {deleteTarget.name}
                    </strong>
                    ? This record will be permanently removed from the system.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm flex items-start gap-2"
                >
                  <AlertCircle
                    size={16}
                    className="shrink-0 mt-0.5 text-red-600"
                  />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                {/* Cancel is the initially focused button */}
                <button
                  type="button"
                  ref={cancelDeleteBtnRef}
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2.5 border border-stone-200 text-slate-700 hover:bg-stone-50 active:bg-stone-100 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Deleting…</span>
                    </>
                  ) : (
                    <span>Delete supplier</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;

