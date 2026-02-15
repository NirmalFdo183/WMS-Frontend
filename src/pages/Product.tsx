import { useState, useEffect } from "react";
import axios from "axios";
import {
  Eye,
  Edit2,
  Trash2,
  PackageSearch,
  Calendar,
  ShoppingBag,
  Plus,
  X,
} from "lucide-react";

interface Product {
  id: number;
  material_code: string;
  name: string;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
  stock?: number;
  status?: "In Stock" | "Low Stock" | "Out of Stock";
  created_at?: string;
  updated_at?: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface BatchStock {
  id: number;
  supplier_invoice_id: number;
  no_cases: number;
  pack_size: number;
  extra_units: number;
  qty: number;
  netprice: number;
  retail_price: number;
  expiry_date: string;
  supplier_invoice?: {
    invoice_number: string;
    invoice_date: string;
  };
}

const Product = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    material_code: "",
    name: "",
    supplier_id: "",
  });

  // Delete State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Stock Detail State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockDetails, setStockDetails] = useState<BatchStock[]>([]);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const getProductStatus = (stock: number | undefined) => {
    const s = stock || 0;
    if (s > 10) return "In Stock";
    if (s > 0) return "Low Stock";
    return "Out of Stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [productsRes, suppliersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`),
      ]);
      setProducts(productsRes.data);
      setSuppliers(suppliersRes.data);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setCurrentProduct(product);
      setFormData({
        material_code: product.material_code,
        name: product.name,
        supplier_id: String(product.supplier_id),
      });
    } else {
      setCurrentProduct(null);
      setFormData({
        material_code: "",
        name: "",
        supplier_id: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProduct(null);
    setFormData({
      material_code: "",
      name: "",
      supplier_id: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentProduct) {
        // Update
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/products/${currentProduct.id}`,
          formData,
        );
      } else {
        // Create
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/products`,
          formData,
        );
      }
      fetchProducts();
      handleCloseModal();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Failed to save product. Please check your input and try again.");
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/products/${productToDelete.id}`,
      );
      fetchProducts();
      setProductToDelete(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product.");
    }
  };

  const handleViewStock = async (product: Product) => {
    setViewingProduct(product);
    setIsStockModalOpen(true);
    setStockLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/batch-stocks/product/${product.id}`,
      );
      setStockDetails(res.data);
    } catch (err) {
      console.error("Error fetching stock details:", err);
    } finally {
      setStockLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.material_code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Products
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Manage your inventory items
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-bold transition-all hover:bg-blue-700 hover:shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading products...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <th className="px-4 sm:px-6 py-4">Material Code</th>
                  <th className="px-4 sm:px-6 py-4">Description</th>
                  <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    Supplier
                  </th>
                  <th className="px-4 sm:px-6 py-4">Stock</th>
                  <th className="px-4 sm:px-6 py-4">Status</th>
                  <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`transition-colors group ${
                      getProductStatus(product.stock) === "Low Stock" ||
                      getProductStatus(product.stock) === "Out of Stock"
                        ? "bg-red-50/50 hover:bg-red-100/50"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-[10px] sm:text-xs text-gray-400 font-mono">
                        {product.material_code}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="font-bold text-gray-900 text-sm sm:text-base">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm hidden sm:table-cell">
                      {product.supplier?.name || "N/A"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-800 font-bold text-sm">
                      {product.stock || 0}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wide ${getStatusColor(getProductStatus(product.stock))}`}
                      >
                        {getProductStatus(product.stock)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewStock(product)}
                          className="p-1.5 sm:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                          title="View Stock Breakdown"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit Product"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete Product"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                {currentProduct ? "Edit Product" : "New Product"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Material Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.material_code}
                  onChange={(e) =>
                    setFormData({ ...formData, material_code: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Supplier
                </label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base appearance-none"
                >
                  <option value="">Select a Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border border-gray-200 font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm sm:text-base"
                >
                  {currentProduct ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Detail Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-sm sm:text-base">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <PackageSearch size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">
                    Stock Breakdown
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {viewingProduct?.name}{" "}
                    <span className="text-gray-400 font-mono text-xs ml-1">
                      ({viewingProduct?.material_code})
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {stockLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="font-bold animate-pulse">
                    Analyzing stock data...
                  </p>
                </div>
              ) : stockDetails.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <div className="text-4xl mb-4">🏜️</div>
                  <h3 className="text-lg font-bold text-gray-800">
                    No Active Batches
                  </h3>
                  <p className="text-gray-500 max-w-xs mx-auto mt-2">
                    This product currently has no recorded stock batches from
                    any suppliers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Total Batches
                      </p>
                      <p className="text-xl font-black text-gray-900">
                        {stockDetails.length}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                        Total Qty
                      </p>
                      <p className="text-xl font-black text-blue-700">
                        {stockDetails.reduce((sum, b) => sum + b.qty, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
                          <th className="px-6 py-4">Supply Ref</th>
                          <th className="px-4 py-4">Batch Vol.</th>
                          <th className="px-4 py-4 text-center">Qty</th>
                          <th className="px-4 py-4 text-right">Net Cost</th>
                          <th className="px-6 py-4">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                        {stockDetails.map((batch) => (
                          <tr key={batch.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <ShoppingBag
                                  size={14}
                                  className="text-gray-400"
                                />
                                <span className="font-bold text-blue-600">
                                  #
                                  {batch.supplier_invoice?.invoice_number ||
                                    "N/A"}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                <Calendar size={10} />{" "}
                                {batch.supplier_invoice?.invoice_date || "--"}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-600">
                                {batch.no_cases} × {batch.pack_size}
                                {batch.extra_units > 0 && (
                                  <span className="text-blue-500 ml-1">
                                    + {batch.extra_units}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">
                                Initial:{" "}
                                {batch.no_cases * batch.pack_size +
                                  batch.extra_units}{" "}
                                Units
                              </p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                                {batch.qty}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-gray-700 font-mono">
                              Rs. {Number(batch.netprice).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 font-semibold">
                              {batch.expiry_date ? (
                                <span
                                  className={
                                    new Date(batch.expiry_date) < new Date()
                                      ? "text-red-500"
                                      : "text-gray-600"
                                  }
                                >
                                  {batch.expiry_date}
                                </span>
                              ) : (
                                <span className="text-gray-300">N/A</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Delete Product?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-800">
                {productToDelete.name}
              </span>
              ? This action cannot be undone and will remove all associated
              data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;
