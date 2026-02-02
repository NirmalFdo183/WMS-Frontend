import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [totalValue, setTotalValue] = useState<number>(0);

  const fetchTotalValue = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/total-sum`);
      setTotalValue(res.data.total);
    } catch (err) {
      console.error("Error fetching total value:", err);
    }
  };

  useEffect(() => {
    fetchTotalValue();
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
          <svg
            className="h-6 w-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-blue-600 font-bold text-lg border border-gray-200">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 font-semibold">
              {user?.name || "User"}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {user?.role || "Admin"}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Warehouse Value</span>
          <span className="text-gray-900 font-bold">
            Rs. {Number(totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
          <span>📅</span>
          <span className="text-sm font-medium">{formattedDate}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-all active:scale-95"
          title="Logout"
        >
          <span>🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
