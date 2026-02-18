import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  contactno: string;
  address: string;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contactno: "",
    address: "",
  });

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
      );
      setSuppliers(res.data);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactno: supplier.contactno || "",
      address: supplier.address || "",
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this supplier? This action cannot be undone.",
      )
    )
      return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/suppliers/${id}`,
      );
      setSuppliers(suppliers.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting supplier:", err);
      alert("Failed to delete supplier");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        const res = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/suppliers/${editingSupplier.id}`,
          formData,
        );
        setSuppliers(
          suppliers.map((s) => (s.id === editingSupplier.id ? res.data : s)),
        );
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
          formData,
        );
        setSuppliers([...suppliers, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error("Error saving supplier:", err);
      alert("Failed to save supplier");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: "", contactno: "", address: "" });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Suppliers
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Manage your relationship with product suppliers
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null);
            setFormData({ name: "", contactno: "", address: "" });
            setShowModal(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold transition-all hover:bg-blue-700 hover:shadow-xl shadow-blue-200 flex items-center gap-2 text-sm active:scale-95"
        >
          <Plus size={20} /> New Supplier
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Supplier Identity</th>
                  <th className="px-8 py-4">Contact Detail</th>
                  <th className="px-8 py-4">Location / Address</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-xs border border-blue-100 shadow-sm shadow-blue-50 w-fit">
                          SUP-{String(supplier.id).padStart(3, "0")}
                        </span>
                        <p className="font-black text-gray-900 text-sm tracking-tight">
                          {supplier.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-bold text-sm">
                          {supplier.contactno || "N/A"}
                        </span>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                          Primary Contact
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-700 max-w-xs truncate">
                        {supplier.address || "No address provided"}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                        <button
                          onClick={() => handleEditClick(supplier)}
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                          title="Edit Supplier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                          title="Delete Supplier"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      No suppliers found. Let's add your first partner!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {editingSupplier ? "Edit" : "Add"} Supplier
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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
            <form
              onSubmit={handleSubmit}
              className="p-5 sm:p-8 space-y-4 sm:space-y-6"
            >
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Supplier Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                  placeholder="e.g. Hemas Pharmaceuticals"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm sm:text-base"
                  placeholder="e.g. +94 112 345 678"
                  value={formData.contactno}
                  onChange={(e) =>
                    setFormData({ ...formData, contactno: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Business Address
                </label>
                <textarea
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  placeholder="Full business address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border border-gray-200 font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-all text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 text-sm sm:text-base"
                >
                  {editingSupplier ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
