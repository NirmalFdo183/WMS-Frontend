import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Calendar, Menu, RefreshCw, AlertCircle } from "lucide-react";
import { useWarehouse } from "../context/WarehouseContext";

interface HeaderProps {
  onMenuClick: () => void;
}

const formatCurrency = (amount: number): string => {
  const safeNum = isNaN(amount) ? 0 : amount;
  return `LKR ${safeNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>("");

  // Use global context for total warehouse value
  const { totalValue, loading: valLoading, error: valError, refreshTotalValue } = useWarehouse();

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0 shadow-xs">
      {/* Left: Sidebar Toggle & Warehouse Value */}
      <div className="flex items-center gap-3 lg:gap-6">
        <button
          type="button"
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-stone-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Warehouse Value Indicator */}
        <div className="flex items-center">
          {valError ? (
            <button
              type="button"
              onClick={refreshTotalValue}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-md text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              title="Click to retry loading warehouse value"
            >
              <AlertCircle size={14} className="text-amber-600" />
              <span>Couldn't load warehouse value — Retry</span>
              <RefreshCw size={12} className={valLoading ? "animate-spin ml-1" : "ml-1"} />
            </button>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">
                Warehouse Value
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm text-slate-900 font-bold font-mono tabular-nums">
                  {valLoading ? (
                    <span className="text-slate-400 font-normal">Updating...</span>
                  ) : (
                    formatCurrency(totalValue)
                  )}
                </span>
                <button
                  type="button"
                  onClick={refreshTotalValue}
                  disabled={valLoading}
                  className="p-0.5 text-slate-400 hover:text-teal-800 rounded transition-colors focus:outline-none"
                  title="Refresh warehouse valuation"
                  aria-label="Refresh warehouse valuation"
                >
                  <RefreshCw size={11} className={valLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Live Clock (Matches POS) */}
      <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-stone-100 px-3 py-1.5 rounded-md border border-stone-200 font-mono tabular-nums">
        <Calendar size={14} className="text-slate-400" />
        <span>{formattedDate}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-900 font-semibold">{currentTime}</span>
      </div>

      {/* Right: Cashier / Admin Profile & Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Profile Badge */}
        <div className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-md bg-teal-800 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="hidden sm:flex flex-col">
            <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
              {user?.name || "Administrator"}
            </p>
            <p className="text-[11px] text-slate-500 font-medium capitalize leading-none mt-0.5">
              {user?.role === "admin"
                ? "Administrator"
                : user?.role === "staff"
                  ? "Warehouse Staff"
                  : user?.role === "rep"
                    ? "Sales Rep"
                    : user?.role === "cashier"
                      ? "Cashier"
                      : "User"}
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-stone-200 hidden sm:block" />

        {/* Secondary Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-stone-300 text-xs font-semibold transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          title="Sign out of current session"
        >
          <LogOut size={14} className="text-slate-500" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
