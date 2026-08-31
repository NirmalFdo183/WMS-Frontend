import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useRouteError,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WarehouseProvider } from "./context/WarehouseContext";
import Login from "./pages/Login";
import Dashboard from "./dashboard/Dashboard";
import Product from "./pages/Product";
import Loading from "./pages/Loading";
import NewSupply from "./pages/NewSupply";
import Resources from "./pages/Resources";
import Shops from "./pages/Shops";
import Settings from "./pages/Settings";
import Suppliers from "./pages/Suppliers";
import SupplyInvoices from "./pages/SupplyInvoices";
import Returns from "./pages/Returns";
import Sales from "./pages/Sales";
import PosTerminal from "./pages/PosTerminal";
import Layout from "./components/Layout";
import "./App.css";

// Route Error Boundary Component
const RouteErrorBoundary = () => {
  const error: any = useRouteError();
  console.error("Route error boundary caught:", error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-4 text-xl font-bold">
        !
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">Something went wrong</h2>
      <p className="text-xs text-slate-500 max-w-md mb-4">
        {error?.message || error?.statusText || "An unexpected error occurred while loading this page."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-semibold shadow-xs transition-colors"
        >
          Reload Page
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded text-xs font-semibold border border-stone-200 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

// Protected Route Wrapper for Admin & Warehouse Staff
const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cashiers are strictly restricted to POS Terminal only
  if (user?.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  return <Layout />;
};

// Protected Route for POS Terminal
const PosProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <PosTerminal />;
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/pos",
    element: <PosProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "suppliers",
        element: <Suppliers />,
      },
      {
        path: "products",
        element: <Product />,
      },
      {
        path: "new-supply",
        element: <NewSupply />,
      },
      {
        path: "loading",
        element: <Loading />,
      },

      {
        path: "resources",
        element: <Resources />,
      },
      {
        path: "shops",
        element: <Shops />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "supply-invoices",
        element: <SupplyInvoices />,
      },
      {
        path: "returns",
        element: <Returns />,
      },
      {
        path: "sales",
        element: <Sales />,
      },
      {
        path: "",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <WarehouseProvider>
        <RouterProvider router={router} />
      </WarehouseProvider>
    </AuthProvider>
  );
}

export default App;
