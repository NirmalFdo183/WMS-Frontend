import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  ShoppingCart,
  Store,
  FileText,
  FolderTree,
  Settings,
  RefreshCw,
} from "lucide-react";

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideBar = ({ isOpen, onClose }: SideBarProps) => {
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    { name: "Suppliers", path: "/suppliers", icon: <Users size={20} /> },
    { name: "Products", path: "/products", icon: <Package size={20} /> },
    { name: "New Supply", path: "/new-supply", icon: <Truck size={20} /> },
    { name: "Loading", path: "/loading", icon: <ShoppingCart size={20} /> },
    { name: "Shops", path: "/shops", icon: <Store size={20} /> },
    { name: "Resources", path: "/resources", icon: <FolderTree size={20} /> },
    {
      name: "Invoices",
      path: "/supply-invoices",
      icon: <FileText size={20} />,
    },
    {
      name: "Returns",
      path: "/returns",
      icon: <RefreshCw size={20} />,
    },
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 text-gray-900 flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } shadow-lg`}
    >
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Thejani Traders</h1>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              // Close sidebar on mobile when a link is clicked
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 font-bold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-gray-400"}`}
                >
                  {item.icon}
                </span>
                <span className="text-sm tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default SideBar;
