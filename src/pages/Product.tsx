import { useState, useEffect } from "react";
import axios from "axios";

interface Product {
  id: number;
  material_code: string;
  name: string;
  category: string;
  stock?: number;
  status?: "In Stock" | "Low Stock" | "Out of Stock";
  created_at?: string;
  updated_at?: string;
}

const Product = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    material_code: "",
    name: "",
    category: "",
    stock: 0,
    status: "In Stock",
  });

  const getStatusColor = (status: string | undefined) => {
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
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/products`,
      );
      setProducts(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products. Please try again.");
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
        category: product.category,
        stock: product.stock || 0,
        status: product.status || "In Stock",
      });
    } else {
      setCurrentProduct(null);
      setFormData({
        material_code: "",
        name: "",
        category: "",
        stock: 0,
        status: "In Stock",
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
      category: "",
      stock: 0,
      status: "In Stock",
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

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_BASE_URL}/products/${id}`,
        );
        fetchProducts();
      } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product.");
      }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Products</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your inventory items</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-bold transition-all hover:bg-blue-700 hover:shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>+</span> Add Product
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
                  <th className="px-4 sm:px-6 py-4">Product Specs</th>
                  <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Category</th>
                  <th className="px-4 sm:px-6 py-4">Stock</th>
                  <th className="px-4 sm:px-6 py-4">Status</th>
                  <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="font-bold text-gray-900 text-sm sm:text-base">
                        {product.name}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 font-mono mt-0.5">
                        {product.material_code}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm hidden sm:table-cell">
                      {product.category}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-800 font-bold text-sm">
                      {product.stock || 0}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wide ${getStatusColor(product.status)}`}
                      >
                        {product.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                {currentProduct ? "Edit Product" : "New Product"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Initial Stock
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Current Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base appearance-none"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
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
    </div>
  );
};

export default Product;
