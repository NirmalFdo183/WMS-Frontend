import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useRouteError,
} from "react-router-dom";
import type { ReactNode } from "react";
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
import PosTerminal from "./pages/PosTerminal";
import MonthlyReports from "./pages/MonthlyReports";
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

const hasWarehouseAccess = (role?: string) =>
  role === "super_admin" || role === "admin" || role === "data_entry";

const hasDataEntryAccess = (role?: string) =>
  role === "super_admin" || role === "admin" || role === "data_entry";

const DataEntryRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return hasDataEntryAccess(user?.role) ? <>{children}</> : <Navigate to="/pos" replace />;
};

const ManagementRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === "super_admin" || user?.role === "admin" ? <>{children}</> : <Navigate to="/new-supply" replace />;
};

// Protected Route Wrapper for Owner, Admin & Data Entry
const ProtectedRoute = () => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cashiers are strictly restricted to POS Terminal only
  if (user?.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  if (!hasWarehouseAccess(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

// Protected Route for POS Terminal (Accessible by Cashiers, Admins and Owner)
const PosProtectedRoute = () => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "super_admin" && user?.role !== "admin" && user?.role !== "cashier") {
    return <Navigate to="/login" replace />;
  }

  return <PosTerminal />;
};

// Route wrapper for Login: redirect already logged-in users to their area
const LoginRoute = () => {
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  if (isAuthLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    return user.role === "cashier" ? (
      <Navigate to="/pos" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }
  return <Login />;
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginRoute />,
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
        element: <ManagementRoute><Dashboard /></ManagementRoute>,
      },
      {
        path: "suppliers",
        element: <ManagementRoute><Suppliers /></ManagementRoute>,
      },
      {
        path: "products",
        element: <ManagementRoute><Product /></ManagementRoute>,
      },
      {
        path: "new-supply",
        element: <DataEntryRoute><NewSupply /></DataEntryRoute>,
      },
      {
        path: "loading",
        element: <DataEntryRoute><Loading /></DataEntryRoute>,
      },

      {
        path: "resources",
        element: <ManagementRoute><Resources /></ManagementRoute>,
      },
      {
        path: "shops",
        element: <ManagementRoute><Shops /></ManagementRoute>,
      },
      {
        path: "settings",
        element: <ManagementRoute><Settings /></ManagementRoute>,
      },
      {
        path: "settings/:tab",
        element: <ManagementRoute><Settings /></ManagementRoute>,
      },
      {
        path: "supply-invoices",
        element: <ManagementRoute><SupplyInvoices /></ManagementRoute>,
      },
      {
        path: "returns",
        element: <DataEntryRoute><Returns /></DataEntryRoute>,
      },
      {
        path: "monthly-reports",
        element: <ManagementRoute><MonthlyReports /></ManagementRoute>,
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
