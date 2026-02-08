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
import Layout from "./components/Layout";
import "./App.css";

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <ProtectedRoute />,
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
