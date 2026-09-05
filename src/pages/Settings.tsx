import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Users,
  FileText,
  Plus,
  Search,
  Eye,
  Key,
  Lock,
  Shield,
  X,
  Trash2,
  AlertCircle,
  Calendar,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Wallet,
  User as UserIcon,
  EyeOff,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type TabId = "cashier-audits" | "manage-users";

interface SystemUser {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  role: "admin" | "cashier";
  created_at?: string;
  sales_count?: number;
}

interface SaleItemAudit {
  id?: number;
  product_id: number;
  batch_id?: number | null;
  qty: number;
  unit_price: number;
  retail_price?: number;
  total: number;
  discount?: number;
  product?: {
    id: number;
    name: string;
    material_code?: string;
    barcode?: string;
  };
}

interface SaleAudit {
  id: number;
  date_time: string;
  user_id: number;
  total: number;
  discount: number;
  payment_type?: "cash" | "card" | string;
  created_at?: string;
  user?: {
    id: number;
    name: string;
    username: string;
    role?: string;
    phone?: string;
  };
  items?: SaleItemAudit[];
}

const formatCurrency = (amount: number) => {
  return `LKR ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { tab } = useParams<{ tab?: string }>();

  // Active view determined by URL route
  const activeTab: TabId =
    tab === "manage-users" || tab === "users"
      ? "manage-users"
      : "cashier-audits";

  // Data states
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [sales, setSales] = useState<SaleAudit[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Manage Users State & Filters
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "cashier">(
    "all"
  );
  const [userSearchTerm, setUserSearchTerm] = useState("");

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<"admin" | "cashier">("cashier");
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // View / Edit User Modal State (Popup Tab)
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [userModalTab, setUserModalTab] = useState<"details" | "security">(
    "details"
  );
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    address: "",
    role: "cashier" as "admin" | "cashier",
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Cashier Audits State, Filters & Pagination (Year, Month, Date Separate)
  const today = new Date();
  const currentYear = String(today.getFullYear());
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0"); // e.g. "09"
  const currentDay = String(today.getDate()).padStart(2, "0"); // e.g. "20"

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedDay, setSelectedDay] = useState<string>(currentDay);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [cashierFilter, setCashierFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  const [selectedAuditSale, setSelectedAuditSale] = useState<SaleAudit | null>(
    null
  );

  // Clear feedback banner automatically
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/users`
      );
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      if (err.response?.status === 403) {
        setFeedback({
          type: "error",
          message: "Access restricted: Only administrators can manage users.",
        });
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Sales / Cashier Audits
  const fetchSales = async () => {
    try {
      setLoadingSales(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/sales`
      );
      setSales(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error fetching sales audits:", err);
    } finally {
      setLoadingSales(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "manage-users") {
      fetchUsers();
    } else {
      fetchSales();
    }
  }, [activeTab]);

  // Open Create User Modal preconfigured by role
  const openCreateModal = (role: "admin" | "cashier") => {
    setCreateRole(role);
    setCreateForm({
      name: "",
      username: "",
      phone: "",
      email: "",
      address: "",
      password: "",
      confirmPassword: "",
    });
    setCreateErrors({});
    setShowCreatePassword(false);
    setIsCreateModalOpen(true);
  };

  // Handle Create User Submit
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!createForm.name.trim()) errors.name = "Full Name is required";
    if (!createForm.username.trim()) errors.username = "Username is required";
    if (!createForm.phone.trim()) errors.phone = "Phone number is required";
    if (!createForm.password) {
      errors.password = "Password is required";
    } else if (createForm.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }
    if (createForm.password !== createForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      setCreateErrors({});
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/users`, {
        name: createForm.name.trim(),
        username: createForm.username.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        address: createForm.address.trim() || null,
        password: createForm.password,
        role: createRole,
      });

      setFeedback({
        type: "success",
        message: `New ${
          createRole === "admin" ? "Administrator" : "Cashier"
        } account "${createForm.username}" created successfully!`,
      });
      setIsCreateModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error("Create User Error:", err);
      const serverMsg =
        err.response?.data?.message ||
        "Failed to create user. Ensure username and phone are unique.";
      setCreateErrors({ form: serverMsg });
    } finally {
      setActionLoading(false);
    }
  };

  // Open User Details & Security Modal
  const openUserDetails = (targetUser: SystemUser) => {
    setSelectedUser(targetUser);
    setUserModalTab("details");
    setEditForm({
      name: targetUser.name,
      username: targetUser.username,
      phone: targetUser.phone,
      email: targetUser.email || "",
      address: targetUser.address || "",
      role: targetUser.role,
    });
    setPasswordForm({
      password: "",
      confirmPassword: "",
    });
    setEditErrors({});
    setShowEditPassword(false);
  };

  // Save User Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = "Full Name is required";
    if (!editForm.username.trim()) errors.username = "Username is required";
    if (!editForm.phone.trim()) errors.phone = "Phone number is required";

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      setEditErrors({});
      const res = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/users/${selectedUser.id}`,
        {
          name: editForm.name.trim(),
          username: editForm.username.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null,
          address: editForm.address.trim() || null,
          role: editForm.role,
        }
      );

      setFeedback({
        type: "success",
        message: `User "${editForm.username}" details updated successfully!`,
      });
      setSelectedUser(res.data);
      await fetchUsers();
    } catch (err: any) {
      console.error("Save User Error:", err);
      const serverMsg =
        err.response?.data?.message || "Failed to update user profile.";
      setEditErrors({ form: serverMsg });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const errors: Record<string, string> = {};
    if (!passwordForm.password) {
      errors.password = "New password is required";
    } else if (passwordForm.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      setEditErrors({});
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/users/${selectedUser.id}/password`,
        {
          password: passwordForm.password,
        }
      );

      setFeedback({
        type: "success",
        message: `Password for "${selectedUser.username}" changed successfully!`,
      });
      setPasswordForm({ password: "", confirmPassword: "" });
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Password Update Error:", err);
      const serverMsg =
        err.response?.data?.message || "Failed to update user password.";
      setEditErrors({ form: serverMsg });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (currentUser?.id === selectedUser.id) {
      alert("You cannot delete your own logged-in administrator account.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedUser.role.toUpperCase()} "${
        selectedUser.name
      }" (@${selectedUser.username})?\nThis action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/users/${selectedUser.id}`
      );
      setFeedback({
        type: "success",
        message: `User "${selectedUser.username}" deleted successfully.`,
      });
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error("Delete User Error:", err);
      const serverMsg =
        err.response?.data?.message || "Failed to delete user account.";
      alert(serverMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      if (userSearchTerm.trim()) {
        const query = userSearchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(query);
        const matchUser = u.username.toLowerCase().includes(query);
        const matchPhone = u.phone.toLowerCase().includes(query);
        const matchEmail = (u.email || "").toLowerCase().includes(query);
        return matchName || matchUser || matchPhone || matchEmail;
      }

      return true;
    });
  }, [users, roleFilter, userSearchTerm]);

  // Unique Cashiers extracted from sales
  const cashierOptions = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach((s) => {
      if (s.user) {
        map.set(String(s.user.id), s.user.name || s.user.username);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sales]);

  // Available Years extracted from sales data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear);
    yearsSet.add(String(Number(currentYear) - 1));
    sales.forEach((s) => {
      if (s.date_time) {
        const y = s.date_time.slice(0, 4);
        if (y) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [sales, currentYear]);

  // Filtered Cashier Audits List (Separate Year, Month, Date, Cashier, Payment, Search)
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Date components check: Year, Month, Day
      if (s.date_time) {
        const cleanDate = s.date_time.slice(0, 10); // "YYYY-MM-DD"
        const [saleYear, saleMonth, saleDay] = cleanDate.split("-");

        if (selectedYear !== "all" && saleYear !== selectedYear) {
          return false;
        }
        if (selectedMonth !== "all" && saleMonth !== selectedMonth) {
          return false;
        }
        if (selectedDay !== "all" && saleDay !== selectedDay) {
          return false;
        }
      }

      // Cashier filter
      if (cashierFilter !== "all" && String(s.user_id) !== cashierFilter) {
        return false;
      }

      // Payment Type filter
      if (paymentFilter !== "all") {
        if (
          (s.payment_type || "cash").toLowerCase() !==
          paymentFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // Search filter
      if (auditSearchTerm.trim()) {
        const query = auditSearchTerm.toLowerCase();
        const matchId = String(s.id).includes(query);
        const matchCashier = (s.user?.name || "").toLowerCase().includes(query);
        const matchUser = (s.user?.username || "").toLowerCase().includes(query);
        const matchItem = (s.items || []).some((it) =>
          (it.product?.name || "").toLowerCase().includes(query)
        );
        return matchId || matchCashier || matchUser || matchItem;
      }

      return true;
    });
  }, [sales, selectedYear, selectedMonth, selectedDay, cashierFilter, paymentFilter, auditSearchTerm]);

  // Pagination for Cashier Audits (20 by 20)
  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, selectedDay, cashierFilter, paymentFilter, auditSearchTerm]);

  // Summary Metrics for Cashier Audits
  const auditMetrics = useMemo(() => {
    const totalTransactions = filteredSales.length;
    const totalRevenue = filteredSales.reduce(
      (sum, s) => sum + Number(s.total || 0),
      0
    );
    const totalDiscounts = filteredSales.reduce(
      (sum, s) => sum + Number(s.discount || 0),
      0
    );
    const uniqueCashiers = new Set(filteredSales.map((s) => s.user_id)).size;

    return {
      totalTransactions,
      totalRevenue,
      totalDiscounts,
      uniqueCashiers,
    };
  }, [filteredSales]);

  // Counts for role filters
  const userCounts = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    const cashiers = users.filter((u) => u.role === "cashier").length;
    return { all: users.length, admin: admins, cashier: cashiers };
  }, [users]);

  return (
    <div className="min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Top Header (Dynamic by current view) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              {activeTab === "manage-users" ? (
                <>
                  <Users className="text-teal-800" size={28} />
                  <span>Manage Users</span>
                </>
              ) : (
                <>
                  <FileText className="text-teal-800" size={28} />
                  <span>Cashier Audits</span>
                </>
              )}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {activeTab === "manage-users"
                ? "Manage system cashiers and administrators, update profiles, and manage security credentials."
                : "Audit sales, transactions, and register cash flow processed by cashiers."}
            </p>
          </div>

          {/* Heading Action Buttons */}
          {activeTab === "manage-users" ? (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openCreateModal("cashier")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Create a new cashier user account"
              >
                <Plus size={16} />
                <span>+ New Cashier</span>
              </button>

              <button
                type="button"
                onClick={() => openCreateModal("admin")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Create a new administrator user account"
              >
                <Plus size={16} />
                <span>+ New Admin</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchSales}
                disabled={loadingSales}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-slate-700 border border-stone-300 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Reload cashier audits from register"
              >
                <RefreshCw
                  size={14}
                  className={loadingSales ? "animate-spin text-teal-700" : ""}
                />
                <span>Refresh Audits</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            role="alert"
            className={`p-4 rounded-lg flex items-center justify-between gap-3 shadow-xs border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-700 shrink-0" />
              )}
              <span className="text-sm font-semibold">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-500 hover:text-slate-800 p-1 rounded cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 1: CASHIER AUDITS VIEW (WITH MONTH FILTER & 20x20 PAGINATION)
           ------------------------------------------------------------- */}
        {activeTab === "cashier-audits" && (
          <div className="space-y-6">
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 shrink-0">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Transactions
                  </p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                    {auditMetrics.totalTransactions}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <DollarSign size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Audited Sales Total
                  </p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                    {formatCurrency(auditMetrics.totalRevenue)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Discounts Given
                  </p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 font-mono text-amber-900">
                    {formatCurrency(auditMetrics.totalDiscounts)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-800 shrink-0">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Audited Cashiers
                  </p>
                  <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">
                    {auditMetrics.uniqueCashiers}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar with Month Filter */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  placeholder="Search by receipt #, cashier name, product..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Separate DATE (Day) Selector */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-300">
                  <Calendar size={14} className="text-teal-800" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Date:
                  </span>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    title="Filter by specific day of the month"
                  >
                    <option value="all">All Days</option>
                    {Array.from({ length: 31 }, (_, i) =>
                      String(i + 1).padStart(2, "0")
                    ).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Separate MONTH Selector */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-300">
                  <Calendar size={14} className="text-teal-800" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Month:
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    title="Filter by month"
                  >
                    <option value="all">All Months</option>
                    <option value="01">January (01)</option>
                    <option value="02">February (02)</option>
                    <option value="03">March (03)</option>
                    <option value="04">April (04)</option>
                    <option value="05">May (05)</option>
                    <option value="06">June (06)</option>
                    <option value="07">July (07)</option>
                    <option value="08">August (08)</option>
                    <option value="09">September (09)</option>
                    <option value="10">October (10)</option>
                    <option value="11">November (11)</option>
                    <option value="12">December (12)</option>
                  </select>
                </div>

                {/* Separate YEAR Selector */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-300">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Year:
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    title="Filter by year"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Date Shortcuts */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(currentYear);
                      setSelectedMonth(currentMonth);
                      setSelectedDay(currentDay);
                    }}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-colors cursor-pointer ${
                      selectedYear === currentYear &&
                      selectedMonth === currentMonth &&
                      selectedDay === currentDay
                        ? "bg-teal-800 text-white border-teal-800"
                        : "bg-white text-slate-600 border-stone-300 hover:bg-stone-50"
                    }`}
                    title="Filter to today's date"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear(currentYear);
                      setSelectedMonth(currentMonth);
                      setSelectedDay("all");
                    }}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md border transition-colors cursor-pointer ${
                      selectedYear === currentYear &&
                      selectedMonth === currentMonth &&
                      selectedDay === "all"
                        ? "bg-teal-800 text-white border-teal-800"
                        : "bg-white text-slate-600 border-stone-300 hover:bg-stone-50"
                    }`}
                    title="Filter to current month (all days)"
                  >
                    This Month
                  </button>
                  {(selectedYear !== "all" ||
                    selectedMonth !== "all" ||
                    selectedDay !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear("all");
                        setSelectedMonth("all");
                        setSelectedDay("all");
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
                      title="Clear all date filters"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Cashier dropdown filter */}
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <UserIcon size={14} className="text-slate-400" />
                  <select
                    value={cashierFilter}
                    onChange={(e) => setCashierFilter(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    <option value="all">All Cashiers</option>
                    {cashierOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment type filter */}
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <CreditCard size={14} className="text-slate-400" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    <option value="all">All Payments</option>
                    <option value="cash">Cash Only</option>
                    <option value="card">Card Only</option>
                  </select>
                </div>

                {(auditSearchTerm ||
                  cashierFilter !== "all" ||
                  paymentFilter !== "all" ||
                  selectedYear !== currentYear ||
                  selectedMonth !== currentMonth ||
                  selectedDay !== currentDay) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuditSearchTerm("");
                      setCashierFilter("all");
                      setPaymentFilter("all");
                      setSelectedYear(currentYear);
                      setSelectedMonth(currentMonth);
                      setSelectedDay(currentDay);
                    }}
                    className="text-xs text-slate-500 hover:text-red-700 font-semibold px-2 py-1 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Audits Data Table */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Receipt #</th>
                      <th className="py-3.5 px-4">Audited Cashier</th>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4 text-center">Items (Units)</th>
                      <th className="py-3.5 px-4 text-center">Payment</th>
                      <th className="py-3.5 px-4 text-right">Discount</th>
                      <th className="py-3.5 px-4 text-right">Net Total</th>
                      <th className="py-3.5 px-4 text-center">Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loadingSales ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-teal-800 border-t-transparent rounded-full animate-spin" />
                            <span className="font-semibold text-xs">
                              Loading cashier register audits...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText size={32} className="text-slate-300" />
                            <p className="font-bold text-slate-700 text-sm">
                              No cashier sales found for this period.
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm">
                              Adjust the month or filters above to view transactions.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSales.map((sale) => {
                        const itemsCount = sale.items?.length || 0;
                        const totalUnits =
                          sale.items?.reduce(
                            (sum, it) => sum + (Number(it.qty) || 0),
                            0
                          ) || 0;
                        const isCash =
                          (sale.payment_type || "cash").toLowerCase() === "cash";

                        return (
                          <tr
                            key={sale.id}
                            className="hover:bg-stone-50/70 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-teal-800">
                              #{sale.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-md bg-stone-100 border border-stone-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {sale.user?.name
                                    ? sale.user.name.charAt(0).toUpperCase()
                                    : "C"}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 leading-snug">
                                    {sale.user?.name || "System Cashier"}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-mono">
                                    @{sale.user?.username || `user_${sale.user_id}`}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              <span className="font-mono text-xs">{sale.date_time}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-semibold text-slate-800">
                                {itemsCount} items
                              </span>
                              <span className="text-[11px] text-slate-500 block font-mono">
                                ({totalUnits} units)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  isCash
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-blue-50 text-blue-800 border-blue-200"
                                }`}
                              >
                                {isCash ? (
                                  <Wallet size={11} />
                                ) : (
                                  <CreditCard size={11} />
                                )}
                                <span>{sale.payment_type || "cash"}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {Number(sale.discount) > 0 ? (
                                <span className="text-amber-800">
                                  - {formatCurrency(Number(sale.discount))}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                              {formatCurrency(Number(sale.total))}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedAuditSale(sale)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-stone-100 text-teal-800 border border-stone-300 font-bold text-xs transition-colors cursor-pointer"
                                title="Inspect sale audit log and receipt items"
                              >
                                <Eye size={13} />
                                <span>Audit Log</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 20 by 20 Pagination Controls */}
              {filteredSales.length > 0 && (
                <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-600 font-medium">
                    Showing{" "}
                    <span className="font-bold text-slate-900">
                      {(currentPage - 1) * PAGE_SIZE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-slate-900">
                      {Math.min(currentPage * PAGE_SIZE, filteredSales.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-slate-900">
                      {filteredSales.length}
                    </span>{" "}
                    total cashier audits
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1 px-2 text-slate-700 font-semibold">
                      <span>Page</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {currentPage}
                      </span>
                      <span>of</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {totalPages}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-stone-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 2: MANAGE USERS TABLE VIEW (CASHIERS & ADMINS ONLY)
           ------------------------------------------------------------- */}
        {activeTab === "manage-users" && (
          <div className="space-y-6">
            {/* Filter Pills & User Search */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    roleFilter === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Users ({userCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("admin")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    roleFilter === "admin"
                      ? "bg-teal-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Shield size={13} />
                  <span>Admins ({userCounts.admin})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("cashier")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    roleFilter === "cashier"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users size={13} />
                  <span>Cashiers ({userCounts.cashier})</span>
                </button>
              </div>

              {/* Search User Input */}
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search user by name, @username, phone, email..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            {/* Users Data Table (Replaced Cards Grid with Table View) */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4 text-center">Role Authority</th>
                      <th className="py-3.5 px-4">Phone Number</th>
                      <th className="py-3.5 px-4">Email Address</th>
                      <th className="py-3.5 px-4 text-center">Sales Activity</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-teal-800 border-t-transparent rounded-full animate-spin" />
                            <span className="font-semibold text-xs">
                              Loading system user accounts...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users size={32} className="text-slate-300" />
                            <p className="font-bold text-slate-700 text-sm">
                              No {roleFilter === "all" ? "" : roleFilter} users found.
                            </p>
                            <p className="text-xs text-slate-400">
                              Use the "+ New Cashier" or "+ New Admin" buttons above to create a user.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isAdmin = u.role === "admin";
                        const initial = u.name ? u.name.charAt(0).toUpperCase() : "U";

                        return (
                          <tr
                            key={u.id}
                            onClick={() => openUserDetails(u)}
                            className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 ${
                                    isAdmin ? "bg-teal-800" : "bg-emerald-700"
                                  }`}
                                >
                                  {initial}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug">
                                    {u.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    ID: #{u.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                              @{u.username}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded border uppercase shrink-0 ${
                                  isAdmin
                                    ? "bg-teal-50 text-teal-800 border-teal-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                {isAdmin ? (
                                  <Shield size={12} />
                                ) : (
                                  <Users size={12} />
                                )}
                                <span>{isAdmin ? "Admin" : "Cashier"}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-800 font-medium">
                              {u.phone}
                            </td>

                            <td className="py-3 px-4 text-slate-600">
                              {u.email || <span className="text-slate-300">-</span>}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isAdmin ? (
                                <span className="text-slate-400 text-[11px] italic">
                                  Admin Authority
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  {u.sales_count ?? 0} sales
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUserDetails(u);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-teal-800 border border-stone-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                                title="Edit user details & change password"
                              >
                                <Key size={13} />
                                <span>Manage</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL 1: CREATE USER POPUP TAB (CASHIER OR ADMIN)
           ------------------------------------------------------------- */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-stone-300 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs ${
                      createRole === "admin" ? "bg-teal-800" : "bg-emerald-700"
                    }`}
                  >
                    {createRole === "admin" ? (
                      <Shield size={16} />
                    ) : (
                      <Users size={16} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Create New {createRole === "admin" ? "Administrator" : "Cashier"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fill in credentials and account details.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4">
                {createErrors.form && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{createErrors.form}</span>
                  </div>
                )}

                {/* Role Switcher in Modal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Role Authority
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateRole("cashier")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        createRole === "cashier"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                          : "bg-white border-stone-300 text-slate-600 hover:bg-stone-50"
                      }`}
                    >
                      <Users size={14} />
                      <span>Cashier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateRole("admin")}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        createRole === "admin"
                          ? "bg-teal-50 border-teal-600 text-teal-900"
                          : "bg-white border-stone-300 text-slate-600 hover:bg-stone-50"
                      }`}
                    >
                      <Shield size={14} />
                      <span>Administrator</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="e.g. Kasun Fernando"
                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                  {createErrors.name && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1">
                      {createErrors.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          username: e.target.value.toLowerCase().trim(),
                        })
                      }
                      placeholder="e.g. kasun_pos"
                      className="w-full px-3.5 py-2 text-xs font-mono font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                    />
                    {createErrors.username && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {createErrors.username}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                      placeholder="e.g. 0771234567"
                      className="w-full px-3.5 py-2 text-xs font-mono font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                    />
                    {createErrors.phone && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {createErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="e.g. cashier@thejani.lk"
                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            password: e.target.value,
                          })
                        }
                        placeholder="Min 8 characters"
                        className="w-full pl-3.5 pr-8 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCreatePassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    {createErrors.password && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {createErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      value={createForm.confirmPassword}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                    />
                    {createErrors.confirmPassword && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {createErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      createRole === "admin"
                        ? "bg-teal-800 hover:bg-teal-900"
                        : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {actionLoading && (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>Create {createRole === "admin" ? "Admin" : "Cashier"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL 2: USER DETAILS & PASSWORD CHANGE POPUP TAB
           ------------------------------------------------------------- */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-stone-300 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                      selectedUser.role === "admin"
                        ? "bg-teal-800"
                        : "bg-emerald-700"
                    }`}
                  >
                    {selectedUser.name
                      ? selectedUser.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedUser.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-500">
                        @{selectedUser.username}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                          selectedUser.role === "admin"
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Popup Tabs (Details vs Security/Password Change) */}
              <div className="flex border-b border-stone-200 bg-stone-100/70 px-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setUserModalTab("details")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                    userModalTab === "details"
                      ? "border-teal-800 text-teal-900 bg-white rounded-t-md"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserIcon size={14} />
                  <span>Profile & Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserModalTab("security")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                    userModalTab === "security"
                      ? "border-teal-800 text-teal-900 bg-white rounded-t-md"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Key size={14} />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {editErrors.form && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{editErrors.form}</span>
                  </div>
                )}

                {/* TAB A: PROFILE DETAILS */}
                {userModalTab === "details" && (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Assigned Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm({ ...editForm, role: "cashier" })
                          }
                          className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            editForm.role === "cashier"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                              : "bg-white border-stone-300 text-slate-600 hover:bg-stone-50"
                          }`}
                        >
                          <Users size={14} />
                          <span>Cashier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm({ ...editForm, role: "admin" })
                          }
                          className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            editForm.role === "admin"
                              ? "bg-teal-50 border-teal-600 text-teal-900"
                              : "bg-white border-stone-300 text-slate-600 hover:bg-stone-50"
                          }`}
                        >
                          <Shield size={14} />
                          <span>Administrator</span>
                        </button>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                      {editErrors.name && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          {editErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Username */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Username *
                        </label>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              username: e.target.value.toLowerCase().trim(),
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs font-mono font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                        {editErrors.username && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">
                            {editErrors.username}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-xs font-mono font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                        {editErrors.phone && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">
                            {editErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Postal Address
                      </label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    {/* Actions bar */}
                    <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                      {currentUser?.id !== selectedUser.id ? (
                        <button
                          type="button"
                          onClick={handleDeleteUser}
                          disabled={actionLoading}
                          className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1.5 p-1 rounded cursor-pointer"
                        >
                          <Trash2 size={15} />
                          <span>Delete User</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          (Logged-in account)
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(null)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {actionLoading && (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB B: CHANGE PASSWORD */}
                {userModalTab === "security" && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-slate-600 leading-relaxed">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Lock size={14} className="text-teal-800" />
                        <span>Update password for @{selectedUser.username}</span>
                      </p>
                      <p className="mt-1 text-[11px]">
                        The user will be required to log in with this new password on their next session.
                      </p>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={passwordForm.password}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              password: e.target.value,
                            })
                          }
                          placeholder="At least 8 characters"
                          className="w-full pl-3.5 pr-8 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showEditPassword ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </div>
                      {editErrors.password && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          {editErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm New Password *
                      </label>
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Repeat new password"
                        className="w-full px-3.5 py-2 text-xs font-medium text-slate-900 border border-stone-300 rounded-lg focus:outline-none focus:border-teal-700"
                      />
                      {editErrors.confirmPassword && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">
                          {editErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    {/* Footer buttons */}
                    <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {actionLoading && (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            MODAL 3: CASHIER SALE AUDIT DETAIL MODAL
           ------------------------------------------------------------- */}
        {selectedAuditSale && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-stone-300 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Audit Log for Receipt #{selectedAuditSale.id}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Recorded on {selectedAuditSale.date_time}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAuditSale(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                {/* Cashier Audit Details Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Cashier Name
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {selectedAuditSale.user?.name || "System Cashier"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Username / ID
                    </span>
                    <p className="font-mono text-slate-700 mt-0.5">
                      @{selectedAuditSale.user?.username || selectedAuditSale.user_id}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Payment Type
                    </span>
                    <p className="font-bold text-slate-900 mt-0.5 uppercase">
                      {selectedAuditSale.payment_type || "cash"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Cashier Phone
                    </span>
                    <p className="font-mono text-slate-700 mt-0.5">
                      {selectedAuditSale.user?.phone || "-"}
                    </p>
                  </div>
                </div>

                {/* Items Audited Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                    Purchased Items Audit
                  </h4>
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-center">Batch #</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedAuditSale.items?.map((it, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {it.product?.name || `Product #${it.product_id}`}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600">
                              {it.batch_id ? `#${it.batch_id}` : "-"}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-900">
                              {it.qty}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatCurrency(Number(it.retail_price || it.unit_price))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(Number(it.total))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(
                        Number(selectedAuditSale.total) +
                          Number(selectedAuditSale.discount || 0)
                      )}
                    </span>
                  </div>

                  {Number(selectedAuditSale.discount) > 0 && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>Total Discount Given:</span>
                      <span className="font-mono">
                        - {formatCurrency(Number(selectedAuditSale.discount))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-stone-300 pt-2 mt-2">
                    <span>Net Sale Amount:</span>
                    <span className="font-mono">
                      {formatCurrency(Number(selectedAuditSale.total))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAuditSale(null)}
                  className="px-4 py-2 bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
