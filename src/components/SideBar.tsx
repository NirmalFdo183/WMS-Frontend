import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();

  const navItems = [
    {
      name: "POS Terminal",
      path: "/pos",
      icon: <ShoppingCart size={18} />,
      badge: "POS",
    },
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    { name: "Suppliers", path: "/suppliers", icon: <Users size={18} /> },
    { name: "Products", path: "/products", icon: <Package size={18} /> },
    { name: "New Supply", path: "/new-supply", icon: <Truck size={18} /> },
    { name: "Loading", path: "/loading", icon: <ShoppingCart size={18} /> },
    { name: "Shops", path: "/shops", icon: <Store size={18} /> },
    { name: "Resources", path: "/resources", icon: <FolderTree size={18} /> },
    {
      name: "Invoices",
      path: "/supply-invoices",
      icon: <FileText size={18} />,
    },
    {
      name: "Returns",
      path: "/returns",
      icon: <RefreshCw size={18} />,
    },
    {
      name: "Sales Register",
      path: "/sales",
      icon: <ShoppingCart size={18} />,
    },
    { name: "Settings", path: "/settings", icon: <Settings size={18} /> },
  ];

  const visibleItems =
    user?.role === "cashier"
      ? navItems.filter((item) => item.path === "/pos")
      : navItems;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 text-slate-900 flex flex-col transform transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } shadow-sm`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-stone-200 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Thejani Traders
            </h1>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
            Warehouse Management
          </p>
        </div>

        {/* Close button for mobile */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-stone-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/50"
          aria-label="Close sidebar"
        >
          <svg
            className="w-5 h-5"
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

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors group focus:outline-none focus:ring-2 focus:ring-teal-700/50 ${
                isActive
                  ? "bg-teal-50 text-teal-900 border-l-4 border-teal-800 font-bold pl-2.5 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-stone-100/70 border-l-4 border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-teal-800" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.badge}
                    </span>
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default SideBar;
