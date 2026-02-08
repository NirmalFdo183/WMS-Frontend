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
    <header className="flex justify-between items-center bg-white border-b border-gray-200 px-4 lg:px-8 py-4 lg:pb-2 lg:mb-8 sticky top-0 z-30 lg:static">
      <div className="flex items-center gap-4 lg:gap-6">
        <button
          type="button"
          className="-ml-2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
          onClick={onMenuClick}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-blue-600 font-bold text-lg border border-gray-200">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-gray-900 font-semibold truncate max-w-[100px] lg:max-w-none">
              {user?.name || "User"}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {user?.role || "Admin"}
            </span>
          </div>
        </div>

        <div className="hidden md:block h-8 w-px bg-gray-200 mx-2"></div>

        <div className="hidden md:flex flex-col">
          <span className="text-[10px] lg:text-xs text-gray-500 uppercase font-bold tracking-wider">Total Warehouse Value</span>
          <span className="text-sm lg:text-base text-gray-900 font-bold">
            Rs. {Number(totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden lg:flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
          <Calendar size={18} className="text-blue-500" />
          <span className="text-sm font-medium">{formattedDate}</span>
        </div>

        <div className="md:hidden flex flex-col items-end">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Wh. Value</span>
          <span className="text-xs font-bold text-gray-800">
            Rs. {Number(totalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
