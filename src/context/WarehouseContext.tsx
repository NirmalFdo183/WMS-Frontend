import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

interface WarehouseContextType {
  totalValue: number;
  loading: boolean;
  error: string | null;
  refreshTotalValue: () => Promise<void>;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(
  undefined,
);

export const WarehouseProvider = ({ children }: { children: ReactNode }) => {
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchTotalValue = async () => {
    // If no token in context, check localStorage as fallback before giving up
    const effectiveToken = token || localStorage.getItem("token");
    if (!effectiveToken) return;

    try {
      setLoading(true);
      setError(null);

      // Ensure auth header is set if not already global
      const config = {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      };

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/total-sum`,
        config,
      );

      // Handle different possible response structures
      const val = res.data?.total !== undefined ? res.data.total : 0;
      setTotalValue(Number(val));
    } catch (err: any) {
      console.error("Error fetching warehouse total value:", err);
      setError(err?.message || "Failed to load warehouse value");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalValue();
  }, [token]);

  const refreshTotalValue = async () => {
    await fetchTotalValue();
  };

  return (
    <WarehouseContext.Provider
      value={{ totalValue, loading, error, refreshTotalValue }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (context === undefined) {
    throw new Error("useWarehouse must be used within a WarehouseProvider");
  }
  return context;
};
