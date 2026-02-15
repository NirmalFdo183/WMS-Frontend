import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUpRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface Stats {
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  total_supply_cost: number;
  manifest_count: number;
  low_stock_count: number;
  daily_stats: {
    loading_date: string;
    revenue: number;
    profit: number;
  }[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/dashboard/stats`,
        );
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    })
      .format(val)
      .replace("LKR", "Rs.");
  };

  const dashboardCards = [
    {
      title: "Stock Management",
      description:
        "Manage products, material codes, and physical inventory levels.",
      icon: <Package className="w-8 h-8 text-blue-500" />,
      link: "/products",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Loading Manifests",
      description: "Process outbound manifests and track delivery performance.",
      icon: <ShoppingCart className="w-8 h-8 text-emerald-500" />,
      link: "/supply-invoices?tab=loading",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Supplier Invoices",
      description:
        "Review incoming stock invoices and monitor supplier payments.",
      icon: <TrendingUp className="w-8 h-8 text-amber-500" />,
      link: "/supply-invoices?tab=supply", // Explicitly set tab for clarity
      color: "bg-amber-50 text-amber-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <header className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-gray-500 mt-2 text-lg">
              Welcome back,{" "}
              <span className="font-bold text-blue-600">
                {user?.name || "User"}
              </span>
              . Here's what's happening today.
            </p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={12} className="mr-1" /> Trending
            </span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">
            Total Revenue
          </p>
          <h3 className="text-2xl font-black text-gray-900">
            {formatCurrency(stats?.total_revenue || 0)}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight size={12} className="mr-1" /> Active
            </span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">
            Total Profit
          </p>
          <h3 className="text-2xl font-black text-emerald-600">
            {formatCurrency(stats?.total_profit || 0)}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-2xl">
              <ShoppingCart className="w-6 h-6 text-red-600" />
            </div>
            <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
              Records
            </span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">
            Total Supply Cost
          </p>
          <h3 className="text-2xl font-black text-gray-900 line-clamp-1">
            {formatCurrency(stats?.total_supply_cost || 0)}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <span className="flex items-center text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full">
              Today
            </span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">
            Delivered Manifests
          </p>
          <h3 className="text-2xl font-black text-gray-900">
            {stats?.manifest_count || 0} Ships
          </h3>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900">
                Revenue vs Profit
              </h3>
              <p className="text-sm text-gray-400">
                Daily performance trends for last 30 days
              </p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily_stats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="loading_date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="profit"
                  name="Profit"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Alerts Section (Instead of static Efficiency Overview) */}
        <div className="flex flex-col gap-6">
          <div className="bg-red-500 p-8 rounded-3xl text-white shadow-xl shadow-red-100 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Low Stock Alert</h3>
                <p className="text-red-100 text-sm">
                  Action required immediately
                </p>
              </div>
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle size={20} />
              </div>
            </div>

            <div className="mt-8">
              <div className="text-4xl font-black mb-2">
                {stats?.low_stock_count || 0}
              </div>
              <p className="text-red-100 text-xs font-bold uppercase tracking-widest">
                Products at risk
              </p>
            </div>

            <button
              onClick={() => navigate("/products")}
              className="mt-8 w-full py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Restock Now <ChevronRight size={16} />
            </button>
          </div>

          <div className="bg-gray-900 p-8 rounded-3xl text-white shadow-xl shadow-gray-200 grow flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">Quick Action</h3>
              <p className="text-gray-400 text-xs font-medium">
                Streamline your workflow
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => navigate("/loading")}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left group"
              >
                <Package
                  className="text-blue-400 mb-2 group-hover:scale-110 transition-transform"
                  size={20}
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                  New Load
                </p>
              </button>
              <button
                onClick={() => navigate("/new-supply")}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left group"
              >
                <TrendingUp
                  className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform"
                  size={20}
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                  Supply
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <h3 className="text-xl font-black text-gray-900 mb-6">System Modules</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.link)}
            className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
          >
            <div
              className={`mb-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${card.color}`}
            >
              {card.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
