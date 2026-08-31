import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
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

// Protected Route Wrapper for Admin (Full System Access)
const AdminProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cashiers are strictly restricted to POS Terminal only
  if (user?.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  // Only admin role can access the warehouse management system
  if (user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

// Protected Route for POS Terminal (Accessible by Cashiers and Admins)
const PosProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow both admin and cashier into POS terminal
  if (user?.role !== "admin" && user?.role !== "cashier") {
    return <Navigate to="/login" replace />;
  }

  return <PosTerminal />;
};

// Route wrapper for Login: redirect already logged-in users to their area
const LoginRoute = () => {
  const { isAuthenticated, user } = useAuth();
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
  },
  {
    path: "/pos",
    element: <PosProtectedRoute />,
  },
  {
    path: "/",
    element: <AdminProtectedRoute />,
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
