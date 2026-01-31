import { useState, useEffect } from "react";
import axios from "axios";

interface Route {
  id: number;
  route_code: string;
  route_description: string;
}

interface Shop {
  id: number;
  shop_code: string;
  shop_name: string;
  Address: string | null;
  phoneno: string | null;
  route_code: string;
}

const Shops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Shop>>({});

  // Fetch Shops
  const fetchShops = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/shops`);
      setShops(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch shops");
    }
  };

  // Fetch Routes for Dropdown
  const fetchRoutes = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/routes`,
      );
      setRoutes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShops();
    fetchRoutes();
  }, []);

  const openModal = (shop: Shop | null = null) => {
    setEditingId(shop ? shop.id : null);
    setFormData(
      shop || {
        shop_code: "",
        shop_name: "",
        Address: "",
        phoneno: "",
        route_code: "",
      },
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/shops/${editingId}`,
          formData,
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/shops`,
          formData,
        );
      }
      fetchShops();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/shops/${id}`);
      fetchShops();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Shop Management</h1>
          <p className="text-gray-500 mt-1">Manage shops and assign routes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Add Shop
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4">Shop Code</th>
              <th className="px-6 py-4">Shop Name</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Address</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td className="px-6 py-4 font-mono font-medium">
                  {shop.shop_code}
                </td>
                <td className="px-6 py-4">{shop.shop_name}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {shop.route_code}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {shop.Address || "-"}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {shop.phoneno || "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openModal(shop)}
                    className="text-blue-600 mr-2 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(shop.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {shops.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No shops found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Shop" : "Add New Shop"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.shop_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_code: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. SHOP001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.shop_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. City Mart"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Route
                </label>
                <select
                  required
                  value={formData.route_code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, route_code: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Select a Route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.route_code}>
                      {route.route_code} - {route.route_description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.Address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, Address: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Address (Optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneno || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneno: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Phone (Optional)"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shops;
