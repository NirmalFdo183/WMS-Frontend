import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import { LogOut, Calendar, Menu } from "lucide-react";

import { useWarehouse } from "../context/WarehouseContext";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Use global context for total warehouse value hhhh
  const { totalValue } = useWarehouse();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 lg:px-8 py-3 sticky top-0 z-30">
      <div className="flex items-center gap-4 lg:gap-8">
        <button
          type="button"
          className="-ml-2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none rounded-xl"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-100 transition-transform group-hover:scale-105">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-gray-900 font-bold text-sm tracking-tight leading-none mb-1">
              {user?.name || "User"}
            </span>
            <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
              {user?.role === "admin"
                ? "Administrator"
                : user?.role === "staff"
                  ? "Warehouse Staff"
                  : user?.role === "rep"
                    ? "Sales Representative"
                    : "User"}
            </span>
          </div>
        </div>

        <div className="hidden md:block h-6 w-px bg-gray-200 mx-2"></div>

        <div className="hidden md:flex flex-col">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">
            Warehouse Value
          </p>
          <p className="text-sm text-gray-900 font-black font-mono">
            Rs.{" "}
            {Number(totalValue).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden xl:flex items-center gap-2 text-gray-500 bg-gray-50/50 px-4 py-2 rounded-xl border border-gray-100">
          <Calendar size={16} className="text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {formattedDate}
          </span>
        </div>

        <div className="md:hidden flex flex-col items-end">
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            Wh. Value
          </span>
          <span className="text-xs font-bold text-gray-800">
            Rs.{" "}
            {Number(totalValue).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 lg:px-4 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all active:scale-95 shadow-sm"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
