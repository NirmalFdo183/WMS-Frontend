import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  Edit2,
  Trash2,
  Plus,
  MapPin,
  Truck as TruckIcon,
  Users,
  UserCheck,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

// Interfaces
interface Route {
  id: number;
  route_code: string;
  route_description: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  licence_plate_no: string;
  description: string | null;
}

interface Employee {
  id: number;
  name: string;
  nic: string;
  phoneno: string;
}

interface SalesRep {
  id: number;
  rep_id: string;
  supplier_id: number;
  route_id: number;
  name: string;
  contact: string | null;
  join_date: string | null;
  supplier?: { name: string };
  route?: { route_code: string };
}

interface ToastNotification {
  text: string;
  type: "success" | "error" | "info";
}

type TabType = "routes" | "trucks" | "employees" | "sales-reps";

const Resources: React.FC = () => {
  // State management for tabs
  const [activeTab, setActiveTab] = useState<TabType>("routes");

  // Data States
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // UI States
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    type: TabType;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Helper to attach authorization header
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

  // Fetch Data Handlers
  const fetchRoutes = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/routes`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setRoutes(data);
    } catch (err: any) {
      console.error("Error fetching routes:", err);
      throw err;
    }
  };

  const fetchTrucks = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/trucks`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTrucks(data);
    } catch (err: any) {
      console.error("Error fetching trucks:", err);
      throw err;
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/employees`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setEmployees(data);
    } catch (err: any) {
      console.error("Error fetching employees:", err);
      throw err;
    }
  };

  const fetchSalesReps = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/sales-reps`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSalesReps(data);
    } catch (err: any) {
      console.error("Error fetching sales reps:", err);
      throw err;
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
        getAuthConfig(),
      );
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSuppliers(data);
    } catch (err: any) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Load Tab Data
  const loadActiveTabData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (activeTab === "routes") await fetchRoutes();
      else if (activeTab === "trucks") await fetchTrucks();
      else if (activeTab === "employees") await fetchEmployees();
      else if (activeTab === "sales-reps") {
        await Promise.all([fetchSalesReps(), fetchSuppliers(), fetchRoutes()]);
      }
    } catch (err: any) {
      console.error(`Error loading ${activeTab} data:`, err);
      setFetchError(
        err.response?.data?.message ||
          "Unable to load resources. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchQuery("");
    loadActiveTabData();
  }, [activeTab]);

  const handleRefresh = async () => {
    await loadActiveTabData();
  };

  // Tab Item Counts
  const tabCounts = useMemo(() => {
    return {
      routes: routes.length,
      trucks: trucks.length,
      employees: employees.length,
      "sales-reps": salesReps.length,
    };
  }, [routes, trucks, employees, salesReps]);

  // Client-Side Search Filters
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.route_code?.toLowerCase().includes(q) ||
        r.route_description?.toLowerCase().includes(q),
    );
  }, [routes, searchQuery]);

  const filteredTrucks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trucks;
    return trucks.filter(
      (t) =>
        t.licence_plate_no?.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [trucks, searchQuery]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.nic?.toLowerCase().includes(q) ||
        e.phoneno?.toLowerCase().includes(q),
    );
  }, [employees, searchQuery]);

  const filteredSalesReps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return salesReps;
    return salesReps.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.rep_id?.toLowerCase().includes(q) ||
        (s.contact && s.contact.toLowerCase().includes(q)) ||
        (s.supplier?.name && s.supplier.name.toLowerCase().includes(q)) ||
        (s.route?.route_code && s.route.route_code.toLowerCase().includes(q)),
    );
  }, [salesReps, searchQuery]);

  // Active Count & Filtered Count
  const currentTotal = tabCounts[activeTab];
  const currentFilteredCount =
    activeTab === "routes"
      ? filteredRoutes.length
      : activeTab === "trucks"
        ? filteredTrucks.length
        : activeTab === "employees"
          ? filteredEmployees.length
          : filteredSalesReps.length;

  // Modal Handlers
  const openModal = (item: any = null) => {
    setEditingId(item ? item.id : null);
    setModalError(null);
    if (activeTab === "routes") {
      setFormData(
        item
          ? {
              route_code: item.route_code,
              route_description: item.route_description,
            }
          : { route_code: "", route_description: "" },
      );
    } else if (activeTab === "trucks") {
      setFormData(
        item
          ? {
              licence_plate_no: item.licence_plate_no,
              description: item.description || "",
            }
          : { licence_plate_no: "", description: "" },
      );
    } else if (activeTab === "employees") {
      setFormData(
        item
          ? { name: item.name, nic: item.nic, phoneno: item.phoneno }
          : { name: "", nic: "", phoneno: "" },
      );
    } else {
      setFormData(
        item
          ? {
              rep_id: item.rep_id,
              supplier_id: item.supplier_id || "",
              route_id: item.route_id || "",
              name: item.name,
              contact: item.contact || "",
              join_date: item.join_date || new Date().toISOString().split("T")[0],
            }
          : {
              rep_id: "",
              supplier_id: suppliers.length > 0 ? suppliers[0].id : "",
              route_id: routes.length > 0 ? routes[0].id : "",
              name: "",
              contact: "",
              join_date: new Date().toISOString().split("T")[0],
            },
      );
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
    setModalError(null);
    setSaving(false);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const resourceName =
      activeTab === "routes"
        ? "Route"
        : activeTab === "trucks"
          ? "Truck"
          : activeTab === "employees"
            ? "Employee"
            : "Sales Rep";

    try {
      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/${activeTab}/${editingId}`,
          formData,
          getAuthConfig(),
        );
        showToast(`${resourceName} updated successfully.`);
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/${activeTab}`,
          formData,
          getAuthConfig(),
        );
        showToast(`${resourceName} created successfully.`);
      }

      // Refresh Data
      if (activeTab === "routes") await fetchRoutes();
      if (activeTab === "trucks") await fetchTrucks();
      if (activeTab === "employees") await fetchEmployees();
      if (activeTab === "sales-reps") await fetchSalesReps();

      closeModal();
    } catch (err: any) {
      console.error("Save error:", err);
      setModalError(
        err.response?.data?.message ||
          "Operation failed. Please verify input data and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete Handlers
  const handleOpenDelete = (item: any) => {
    const name =
      item.route_code ||
      item.licence_plate_no ||
      item.name ||
      `Record #${item.id}`;
    setDeleteTarget({ id: item.id, name, type: activeTab });
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

    const resourceName =
      deleteTarget.type === "routes"
        ? "Route"
        : deleteTarget.type === "trucks"
          ? "Truck"
          : deleteTarget.type === "employees"
            ? "Employee"
            : "Sales Rep";

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/${deleteTarget.type}/${deleteTarget.id}`,
        getAuthConfig(),
      );
      showToast(`${resourceName} "${deleteTarget.name}" deleted successfully.`);

      if (deleteTarget.type === "routes") await fetchRoutes();
      if (deleteTarget.type === "trucks") await fetchTrucks();
      if (deleteTarget.type === "employees") await fetchEmployees();
      if (deleteTarget.type === "sales-reps") await fetchSalesReps();

      closeDeleteModal();
    } catch (err: any) {
      console.error("Delete error:", err);
      setDeleteError(
        err.response?.data?.message ||
          `Failed to delete ${resourceName.toLowerCase()}. It may be referenced in existing active operations.`,
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
            aria-label="Dismiss notification"
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
            Fleet & Resource Logistics
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Resource Management
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Manage distribution routes, transport vehicles, staff, and sales representatives.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 active:bg-stone-100 text-slate-700 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:opacity-60 shadow-xs cursor-pointer"
          >
            <RefreshCw
              size={16}
              className={`text-slate-600 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>
              Add{" "}
              {activeTab === "routes"
                ? "Route"
                : activeTab === "trucks"
                  ? "Truck"
                  : activeTab === "employees"
                    ? "Employee"
                    : "Sales Rep"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-stone-200 rounded-xl shadow-xs overflow-x-auto no-scrollbar">
        {[
          { id: "routes" as TabType, label: "Routes", icon: MapPin },
          { id: "trucks" as TabType, label: "Trucks", icon: TruckIcon },
          { id: "employees" as TabType, label: "Employees", icon: Users },
          {
            id: "sales-reps" as TabType,
            label: "Sales Reps",
            icon: UserCheck,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-teal-800 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/80"
              }`}
            >
              <Icon size={16} className={isActive ? "text-teal-200" : "text-slate-500"} />
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                  isActive
                    ? "bg-teal-900/60 text-teal-100"
                    : "bg-stone-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Metrics Toolbar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${
              activeTab === "routes"
                ? "routes by code or description..."
                : activeTab === "trucks"
                  ? "trucks by plate number or spec..."
                  : activeTab === "employees"
                    ? "employees by name, NIC, or phone..."
                    : "sales reps by name, ID, route, or supplier..."
            }`}
            className="w-full pl-9 pr-9 py-2 text-sm bg-stone-50/70 border border-stone-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Counter Badge */}
        <div className="text-xs sm:text-sm text-slate-600 font-medium md:text-right shrink-0">
          {loading ? (
            <span>Loading data…</span>
          ) : fetchError ? (
            <span className="text-red-600">Error loading data</span>
          ) : searchQuery.trim() ? (
            <span>
              Showing <strong className="text-slate-900">{currentFilteredCount}</strong> of{" "}
              {currentTotal} {activeTab.replace("-", " ")}
            </span>
          ) : (
            <span>
              Total <strong className="text-slate-900">{currentTotal}</strong>{" "}
              {activeTab.replace("-", " ")}
            </span>
          )}
        </div>
      </div>

      {/* 4. In-App Failure State */}
      {fetchError && !loading && (
        <div
          role="alert"
          className="bg-white border border-red-200 rounded-xl p-8 shadow-sm text-center animate-in fade-in duration-200"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Unable to load {activeTab.replace("-", " ")}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {fetchError}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-slate-800 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50 shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 5. Loading State: Skeleton Placeholder Rows */}
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

      {/* 6. Content Tables */}
      {!loading && !fetchError && (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          {/* TAB 1: ROUTES TABLE */}
          {activeTab === "routes" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Route Code</th>
                    <th className="py-3.5 px-4 sm:px-6">Description & Coverage Area</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <MapPin size={36} className="text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">
                            No distribution routes found
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query."
                              : "Click '+ Add Route' above to register your first route."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-teal-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                          <span className="font-mono text-xs font-medium px-2.5 py-1 rounded-md bg-stone-100 text-slate-700 border border-stone-200/80">
                            {r.route_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {r.route_description}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openModal(r)}
                              title="Edit Route"
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-stone-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(r)}
                              title="Delete Route"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: TRUCKS TABLE */}
          {activeTab === "trucks" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">License Plate No</th>
                    <th className="py-3.5 px-4 sm:px-6">Vehicle Specification</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredTrucks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <TruckIcon size={36} className="text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">
                            No vehicles found
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query."
                              : "Click '+ Add Truck' above to register a new transport truck."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrucks.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-teal-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                          <span className="font-mono text-xs font-medium px-2.5 py-1 rounded-md bg-stone-100 text-slate-700 border border-stone-200/80">
                            {t.licence_plate_no}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {t.description || (
                            <span className="text-slate-400 italic">No description provided</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openModal(t)}
                              title="Edit Vehicle"
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-stone-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(t)}
                              title="Delete Vehicle"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: EMPLOYEES TABLE */}
          {activeTab === "employees" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Full Name</th>
                    <th className="py-3.5 px-4 sm:px-6">NIC / Identification</th>
                    <th className="py-3.5 px-4 sm:px-6">Mobile Contact</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Users size={36} className="text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">
                            No employees found
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query."
                              : "Click '+ Add Employee' above to register staff members."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-teal-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                          {e.name}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-medium">
                          <span className="font-mono text-xs font-medium px-2.5 py-1 rounded-md bg-stone-100 text-slate-700 border border-stone-200/80">
                            {e.nic}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {e.phoneno || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openModal(e)}
                              title="Edit Employee"
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-stone-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(e)}
                              title="Delete Employee"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SALES REPS TABLE */}
          {activeTab === "sales-reps" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Representative</th>
                    <th className="py-3.5 px-4 sm:px-6">Supplier Entity</th>
                    <th className="py-3.5 px-4 sm:px-6">Route Allocation</th>
                    <th className="py-3.5 px-4 sm:px-6">Direct Contact</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredSalesReps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <UserCheck size={36} className="text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">
                            No sales representatives found
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query."
                              : "Click '+ Add Sales Rep' above to register a sales representative."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSalesReps.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-teal-50/20 transition-colors group"
                      >
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-slate-700 border border-stone-200/80 shrink-0">
                              {s.rep_id}
                            </span>
                            <span className="font-semibold text-slate-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {s.supplier?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6">
                          {s.route?.route_code ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                              {s.route.route_code}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-slate-700 font-medium">
                          {s.contact || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openModal(s)}
                              title="Edit Sales Rep"
                              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-stone-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40 cursor-pointer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(s)}
                              title="Delete Sales Rep"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. Add / Edit Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {editingId ? "Edit Resource" : "Create New Resource"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === "routes"
                    ? "Distribution Route Details"
                    : activeTab === "trucks"
                      ? "Vehicle Details"
                      : activeTab === "employees"
                        ? "Employee Identification & Contact"
                        : "Sales Representative Assignment"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {modalError && (
              <div
                role="alert"
                className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* ROUTES FORM */}
              {activeTab === "routes" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Route Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RT-COL-01"
                      required
                      value={formData.route_code || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          route_code: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Description & Coverage Area <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      placeholder="Describe geographic area, coverage towns, and landmarks..."
                      required
                      rows={3}
                      value={formData.route_description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          route_description: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 resize-none font-medium"
                    />
                  </div>
                </>
              )}

              {/* TRUCKS FORM */}
              {activeTab === "trucks" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      License Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WP WP-1234 or ABC-1234"
                      required
                      value={formData.licence_plate_no || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          licence_plate_no: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Vehicle Specifications
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5 Ton Lorry, Isuzu NKR, Freezer Unit"
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </>
              )}

              {/* EMPLOYEES FORM */}
              {activeTab === "employees" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kamal Perera"
                      required
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        NIC / Identification <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 199512345678 or 951234567V"
                        required
                        value={formData.nic || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, nic: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Mobile Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 0771234567"
                        required
                        value={formData.phoneno || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phoneno: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SALES REPS FORM */}
              {activeTab === "sales-reps" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Rep ID / Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REP-01"
                        required
                        value={formData.rep_id || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, rep_id: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sunimal Dias"
                        required
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Supplier Entity <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.supplier_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            supplier_id: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors font-medium text-slate-900"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Assigned Route <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.route_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            route_id: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors font-medium text-slate-900 font-mono"
                      >
                        <option value="">Select Route</option>
                        {routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.route_code} — {r.route_description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Direct Phone Contact
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 0771234567"
                        value={formData.contact || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors placeholder:text-slate-400 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Joined Date
                      </label>
                      <input
                        type="date"
                        value={formData.join_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            join_date: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 transition-colors font-medium text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>{editingId ? "Save Changes" : "Create Resource"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. In-App Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center">
              Delete Resource
            </h3>
            <p className="text-sm text-slate-600 text-center mt-1">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">"{deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>

            {deleteError && (
              <div
                role="alert"
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete Resource</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
