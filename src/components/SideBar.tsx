import { NavLink } from "react-router-dom";

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SideBar = ({ isOpen, onClose }: SideBarProps) => {
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" },
    { name: "Suppliers", path: "/suppliers", icon: "🏢" },
    { name: "Products", path: "/products", icon: "📦" },
    { name: "New Supply", path: "/new-supply", icon: "🚚" },
    { name: "Loading", path: "/loading", icon: "🚛" },
    { name: "Shops", path: "/shops", icon: "🏪" },
    { name: "Invoices", path: "/supply-invoices", icon: "📜" },
    { name: "Resources", path: "/resources", icon: "🗂️" },
    { name: "Settings", path: "/settings", icon: "⚙️" },
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
              `flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200 ${
                isActive
                  ? "bg-gray-100 text-blue-600 font-semibold border-l-4 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default SideBar;
