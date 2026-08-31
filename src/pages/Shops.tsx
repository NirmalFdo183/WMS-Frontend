import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  AlertTriangle,
  Store,
  LogIn,
} from "lucide-react";

interface Route {
  id: number;
  route_code: string;
  route_description: string;
}

interface Shop {
  id: number;
  shop_code: string;
  shop_name: string;
  Address: string | null;
  phoneno: string | null;
  route_code: string;
}

interface ToastNotification {
  text: string;
  type: "success" | "error" | "info";
}

const Shops: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [shops, setShops] = useState<Shop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("all");

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Shop>>({});
  const [saving, setSaving] = useState(false);
  const [dialogGeneralError, setDialogGeneralError] = useState<string | null>(null);

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Helper to ensure Bearer token & JSON headers are always attached
  const getAuthConfig = () => {
    const rawToken = localStorage.getItem("token");
    const token =
      rawToken && rawToken !== "null" && rawToken !== "undefined"
        ? rawToken.trim()
        : null;
    return {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  };

  // Fetch Shops
  const fetchShops = async () => {
    setLoading(true);
    setFetchError(null);
    setIsAuthError(false);

    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      setIsAuthError(true);
      setFetchError(
        "Your login session has expired or is invalid. Please log in again to load shop records.",
      );
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/shops`,
        getAuthConfig(),
      );
      console.log("Shops API response:", res.data);

      // Handle direct arrays, { data: [...] }, or { shops: [...] }
      const rawData =
        res.data?.shops ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);

      const normalizedShops = (Array.isArray(rawData) ? rawData : []).map(
        (s: any) => ({
          ...s,
          Address: s.Address ?? s.address ?? null,
          phoneno: s.phoneno ?? s.phone ?? null,
        }),
      );

      setShops(normalizedShops);
    } catch (err: any) {
      console.error(
        "Error fetching shops:",
        err.response?.status,
        err.response?.data || err.message,
      );

      if (
        err.response?.status === 401 ||
        err.response?.data?.message?.toLowerCase().includes("unauthenticated")
      ) {
        setIsAuthError(true);
        setFetchError(
          "Your login session has expired or is invalid. Please log in again to load shop records.",
        );
      } else {
        const errorMsg =
          err.response?.data?.message ||
          "Unable to load shops. Please check your network connection and server status.";
        setFetchError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Routes for Dropdown
  const fetchRoutes = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/routes`,
        getAuthConfig(),
      );
      console.log("Routes API response:", res.data);

      const rawRoutes =
        res.data?.routes ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);

      setRoutes(Array.isArray(rawRoutes) ? rawRoutes : []);
    } catch (err: any) {
      console.error(
        "Error fetching routes:",
        err.response?.status,
        err.response?.data || err.message,
      );
    }
  };

  useEffect(() => {
    fetchShops();
    fetchRoutes();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    await Promise.all([fetchShops(), fetchRoutes()]);
  };

  // Filtered Shops List
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        shop.shop_name?.toLowerCase().includes(q) ||
        shop.shop_code?.toLowerCase().includes(q) ||
        shop.route_code?.toLowerCase().includes(q) ||
        (shop.phoneno && shop.phoneno.toLowerCase().includes(q)) ||
        (shop.Address && shop.Address.toLowerCase().includes(q));

      const matchesRoute =
        selectedRoute === "all" || shop.route_code === selectedRoute;

      return matchesSearch && matchesRoute;
    });
  }, [shops, searchQuery, selectedRoute]);

  const openModal = (shop: Shop | null = null) => {
    setEditingId(shop ? shop.id : null);
    setDialogGeneralError(null);
    setFormData(
      shop
        ? {
            shop_code: shop.shop_code,
            shop_name: shop.shop_name,
            Address: shop.Address || "",
            phoneno: shop.phoneno || "",
            route_code: shop.route_code,
          }
        : {
            shop_code: "",
            shop_name: "",
            Address: "",
            phoneno: "",
            route_code: routes.length > 0 ? routes[0].route_code : "",
          },
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
    setDialogGeneralError(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogGeneralError(null);

    try {
      const payload = {
        ...formData,
        address: formData.Address || null,
        Address: formData.Address || null,
        phone: formData.phoneno || null,
        phoneno: formData.phoneno || null,
      };

      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/shops/${editingId}`,
          payload,
          getAuthConfig(),
        );
        showToast(`Shop "${formData.shop_name}" updated successfully.`);
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/shops`,
          payload,
          getAuthConfig(),
        );
        showToast(`Shop "${formData.shop_name}" added successfully.`);
      }
      await fetchShops();
      closeModal();
    } catch (err: any) {
      console.error(
        "Save error:",
        err.response?.status,
        err.response?.data || err.message,
      );
      setDialogGeneralError(
        err.response?.data?.message ||
          "Operation failed. Please verify input data and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (shop: Shop) => {
    setDeleteTarget(shop);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
    setDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/shops/${deleteTarget.id}`,
        getAuthConfig(),
      );
      showToast(`Shop "${deleteTarget.shop_name}" deleted successfully.`);
      await fetchShops();
      closeDeleteModal();
    } catch (err: any) {
      console.error(
        "Delete error:",
        err.response?.status,
        err.response?.data || err.message,
      );
      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete shop. Existing loading manifests or orders may be linked.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] text-slate-900 font-sans antialiased">
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
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Route & Shop Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Shop Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage registered retail shops and assign delivery distribution routes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh shop list"
            aria-label="Refresh shop list"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-stone-200 bg-white text-slate-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-700" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 shrink-0"
          >
            <Plus size={18} aria-hidden="true" />
            <span>Add Shop</span>
          </button>
        </div>
      </div>

      {/* 2. Toolbar: Search, Route Filter & Counter */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by shop name, code, route, or phone..."
              aria-label="Search shops"
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

          {/* Route Filter Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              aria-label="Filter by route"
              className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition-colors"
            >
              <option value="all">All Routes</option>
              {routes.map((route) => (
                <option key={route.id} value={route.route_code}>
                  {route.route_code} ({route.route_description})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="text-xs sm:text-sm text-slate-600 font-medium md:text-right shrink-0">
          {loading ? (
            <span>Loading shops…</span>
          ) : fetchError ? (
            <span className="text-red-600">Error loading data</span>
          ) : searchQuery.trim() || selectedRoute !== "all" ? (
            <span>
              Showing <strong className="text-slate-900">{filteredShops.length}</strong> of{" "}
              {shops.length} {shops.length === 1 ? "shop" : "shops"}
            </span>
          ) : (
            <span>
              Total <strong className="text-slate-900">{shops.length}</strong>{" "}
              {shops.length === 1 ? "shop" : "shops"}
            </span>
          )}
        </div>
      </div>

      {/* 3. In-App Failure / Retry State */}
      {fetchError && !loading && (
        <div
          role="alert"
          className="bg-white border border-red-200 rounded-xl p-8 shadow-sm text-center animate-in fade-in duration-200"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {isAuthError ? "Authentication Required" : "Unable to load shops"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {fetchError}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {isAuthError ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 shadow-xs cursor-pointer"
                >
                  <LogIn size={16} />
                  <span>Log In Again</span>
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={15} />
                  <span>Retry Connection</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 shadow-xs cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Loading State: Skeleton Placeholder Rows */}
      {loading && (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="h-4 bg-stone-200 rounded w-1/4 animate-pulse"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-14 bg-stone-100 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Shop Data Table Card */}
      {!loading && !fetchError && (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3.5">
                    Shop Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Assigned Route
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Contact & Location
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {filteredShops.map((shop) => (
                  <tr
                    key={shop.id}
                    className="hover:bg-stone-50/70 transition-colors group"
                  >
                    {/* Shop Details */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 w-fit mb-1 inline-block">
                          {shop.shop_code}
                        </span>
                        <span className="font-semibold text-slate-900 text-sm sm:text-base leading-snug">
                          {shop.shop_name}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Route */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-slate-700 border border-stone-200">
                        {shop.route_code}
                      </span>
                    </td>

                    {/* Contact & Location */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs sm:text-sm text-slate-800 select-all font-medium">
                          {shop.phoneno || <span className="text-slate-400 font-sans font-normal">—</span>}
                        </p>
                        <p className="text-xs text-slate-500 break-words max-w-sm sm:max-w-md leading-relaxed">
                          {shop.Address || <span className="text-slate-400">—</span>}
                        </p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openModal(shop)}
                          title={`Edit ${shop.shop_name}`}
                          aria-label={`Edit ${shop.shop_name}`}
                          className="p-2 text-slate-500 hover:text-teal-900 hover:bg-teal-50 rounded-lg border border-transparent hover:border-teal-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(shop)}
                          title={`Delete ${shop.shop_name}`}
                          aria-label={`Delete ${shop.shop_name}`}
                          className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600/40"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Empty Filter State */}
                {filteredShops.length === 0 && shops.length > 0 && (
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
                          No shops match your search
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          No records found matching "{searchQuery}"
                          {selectedRoute !== "all" ? ` under route ${selectedRoute}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedRoute("all");
                          }}
                          className="mt-3 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Empty Directory State */}
                {shops.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-slate-400 mb-3">
                          <Store size={24} />
                        </div>
                        <p className="text-base font-semibold text-slate-900">
                          No shops recorded yet
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Get started by registering your first retail shop and assigning a route.
                        </p>
                        <button
                          type="button"
                          onClick={() => openModal()}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 shadow-sm"
                        >
                          <Plus size={16} />
                          <span>Add Shop</span>
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

      {/* 6. Add / Edit Shop Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit Shop" : "Add New Shop"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {editingId
                    ? "Update retail shop registration and assigned route."
                    : "Enter new shop details and assign an outbound delivery route."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Banner */}
            {dialogGeneralError && (
              <div
                role="alert"
                className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm flex items-start gap-2"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{dialogGeneralError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shop Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.shop_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_code: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-colors font-mono"
                  placeholder="e.g. SHOP-001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.shop_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_name: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-colors"
                  placeholder="e.g. City Mart Supermarket"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Route <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.route_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, route_code: e.target.value })
                  }
                  className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-colors"
                >
                  <option value="">Select a Route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.route_code}>
                      {route.route_code} - {route.route_description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneno || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneno: e.target.value })
                  }
                  className="w-full h-10 px-3.5 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-colors"
                  placeholder="e.g. 0112345678 or +94 77 123 4567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.Address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, Address: e.target.value })
                  }
                  className="w-full p-3 text-sm text-slate-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-colors resize-none"
                  placeholder="Street address or location landmark"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Shop" : "Save Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-stone-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-200">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Delete Shop?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <b className="text-slate-800">{deleteTarget.shop_name}</b> ({deleteTarget.shop_code})? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs text-left">
                {deleteError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="py-2 px-3 font-semibold text-slate-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-xs shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="py-2 px-3 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors text-xs disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Shop"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shops;

