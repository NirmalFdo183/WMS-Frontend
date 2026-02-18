import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2 } from "lucide-react";

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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Shop Management
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Manage shops and assign routes
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold transition-all hover:bg-blue-700 hover:shadow-xl shadow-blue-200 flex items-center gap-2 text-sm active:scale-95"
        >
          <Plus size={20} /> Add Shop
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-4">Shop Details</th>
                <th className="px-8 py-4">Assigned Route</th>
                <th className="px-8 py-4">Contact & Location</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shops.map((shop) => (
                <tr
                  key={shop.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-sm border border-blue-100 shadow-sm shadow-blue-50 w-fit mb-1">
                        {shop.shop_code}
                      </span>
                      <p className="font-black text-gray-900 text-sm tracking-tight">
                        {shop.shop_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {shop.route_code}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-700">
                        {shop.phoneno || "No contact"}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        {shop.Address || "No address"}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                      <button
                        onClick={() => openModal(shop)}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                        title="Edit Shop"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(shop.id)}
                        className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                        title="Delete Shop"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shops.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-12 text-center text-gray-400 font-medium"
                  >
                    No shops found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
