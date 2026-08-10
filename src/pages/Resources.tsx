import { useState, useEffect } from "react";
import axios from "axios";
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  MapPin,
  Truck as TruckIcon,
  Users,
  UserCheck,
} from "lucide-react";

// Interfaces
interface Route {
  id: number;
  route_code: string;
  route_description: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface Truck {
  id: number;
  licence_plate_no: string;
  description: string | null;
}

interface Employee {
  id: number;
  name: string;
  nic: string;
  phoneno: string;
}

interface SalesRep {
  id: number;
  rep_id: string;
  supplier_id: number;
  route_id: number;
  name: string;
  contact: string | null;
  join_date: string | null;
  supplier?: { name: string };
  route?: { route_code: string };
}

const Resources = () => {
  // State management for tabs
  const [activeTab, setActiveTab] = useState<
    "routes" | "trucks" | "employees" | "sales-reps"
  >("routes");

  // Data States
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State (Dynamic based on active tab)
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // Fetch Data Handlers
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

  const fetchTrucks = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/trucks`,
      );
      setTrucks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/employees`,
      );
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesReps = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/sales-reps`,
      );
      setSalesReps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/suppliers`,
      );
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      if (activeTab === "routes") await fetchRoutes();
      else if (activeTab === "trucks") await fetchTrucks();
      else if (activeTab === "employees") await fetchEmployees();
      else if (activeTab === "sales-reps") {
        await Promise.all([fetchSalesReps(), fetchSuppliers(), fetchRoutes()]);
      }
      setLoading(false);
    };
    loadData();
  }, [activeTab]);

  // Modal Handlers
  const openModal = (item: any = null) => {
    setEditingId(item ? item.id : null);
    if (activeTab === "routes") {
      setFormData(item || { route_code: "", route_description: "" });
    } else if (activeTab === "trucks") {
      setFormData(item || { licence_plate_no: "", description: "" });
    } else if (activeTab === "employees") {
      setFormData(item || { name: "", nic: "", phoneno: "" });
    } else {
      setFormData(
        item || {
          rep_id: "",
          supplier_id: "",
          route_id: "",
          name: "",
          contact: "",
          join_date: new Date().toISOString().split("T")[0],
        },
      );
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/${activeTab}/${editingId}`,
          formData,
        );
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/${activeTab}`,
          formData,
        );
      }
      // Refresh Data
      if (activeTab === "routes") fetchRoutes();
      if (activeTab === "trucks") fetchTrucks();
      if (activeTab === "employees") fetchEmployees();
      if (activeTab === "sales-reps") fetchSalesReps();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Operation failed. Please check inputs.");
    }
  };

  // Delete Handler
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure?")) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/${activeTab}/${id}`,
      );
      if (activeTab === "routes") fetchRoutes();
      if (activeTab === "trucks") fetchTrucks();
      if (activeTab === "employees") fetchEmployees();
      if (activeTab === "sales-reps") fetchSalesReps();
    } catch (err) {
      console.error(err);
      alert("Delete failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Resource Management
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Manage Routes, Trucks, Employees and Sales Representatives
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold transition-all hover:bg-blue-700 hover:shadow-xl shadow-blue-200 flex items-center gap-2 text-sm active:scale-95"
        >
          <Plus size={20} />
          Add{" "}
          {activeTab === "routes"
            ? "Route"
            : activeTab === "trucks"
              ? "Truck"
              : activeTab === "employees"
                ? "Employee"
                : "Sales Rep"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-10 overflow-x-auto no-scrollbar max-w-fit">
        {[
          { id: "routes", label: "Routes", icon: <MapPin size={16} /> },
          { id: "trucks", label: "Trucks", icon: <TruckIcon size={16} /> },
          { id: "employees", label: "Employees", icon: <Users size={16} /> },
          {
            id: "sales-reps",
            label: "Sales Reps",
            icon: <UserCheck size={16} />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === "routes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Route Information</th>
                  <th className="px-8 py-4">Description</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      Loading routes...
                    </td>
                  </tr>
                ) : routes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      No routes found
                    </td>
                  </tr>
                ) : (
                  routes.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-sm border border-blue-100 shadow-sm shadow-blue-50">
                          {r.route_code}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-700 text-sm">
                        {r.route_description}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => openModal(r)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                            title="Edit Route"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                            title="Delete Route"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "trucks" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Vehicle Identification</th>
                  <th className="px-8 py-4">Description</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      Loading trucks...
                    </td>
                  </tr>
                ) : trucks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      No trucks found
                    </td>
                  </tr>
                ) : (
                  trucks.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <span className="font-mono font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl text-sm border border-blue-100 shadow-sm shadow-blue-50">
                          {t.licence_plate_no}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-700 text-sm">
                        {t.description || "-"}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => openModal(t)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                            title="Edit Truck"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                            title="Delete Truck"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "employees" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Employee Details</th>
                  <th className="px-8 py-4 text-center">
                    NIC / Identification
                  </th>
                  <th className="px-8 py-4">Contact</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <p className="font-black text-gray-900 text-sm tracking-tight">
                          {e.name}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-mono font-black text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg text-xs border border-gray-100">
                          {e.nic}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-700 text-sm italic">
                        {e.phoneno}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => openModal(e)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                            title="Edit Employee"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                            title="Delete Employee"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "sales-reps" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-4">Representative</th>
                  <th className="px-8 py-4">Supplier</th>
                  <th className="px-8 py-4 text-center">Route Allocation</th>
                  <th className="px-8 py-4">Direct Contact</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      Loading sales reps...
                    </td>
                  </tr>
                ) : salesReps.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-gray-400 font-medium"
                    >
                      No sales representatives found
                    </td>
                  </tr>
                ) : (
                  salesReps.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                            {s.rep_id}
                          </div>
                          <p className="font-black text-gray-900 text-sm tracking-tight">
                            {s.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-700 text-sm">
                        {s.supplier?.name || "N/A"}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-mono font-black text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg text-[10px] border border-blue-100 uppercase">
                          {s.route?.route_code || "N/A"}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-700 text-sm">
                        {s.contact || "-"}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => openModal(s)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 active:scale-90"
                            title="Edit Sales Rep"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 active:scale-90"
                            title="Delete Sales Rep"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-sm tracking-tight">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                  {editingId ? "Edit Resource" : "Create New Resource"}
                </h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 leading-none">
                  {activeTab.replace("-", " ")} Registry Entry
                </p>
              </div>
              <button
                onClick={closeModal}
                className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {activeTab === "routes" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Route Allocation Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. RT-KOL-01"
                        required
                        value={formData.route_code || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            route_code: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Operational Description
                      </label>
                      <textarea
                        placeholder="Describe coverage area and landmarks..."
                        required
                        rows={3}
                        value={formData.route_description || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            route_description: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 no-scrollbar resize-none"
                      />
                    </div>
                  </>
                )}

                {activeTab === "trucks" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        License Plate Number
                      </label>
                      <input
                        type="text"
                        placeholder="ABC-1234"
                        required
                        value={formData.licence_plate_no || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            licence_plate_no: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Vehicle Specifications
                      </label>
                      <input
                        type="text"
                        placeholder="E.g. 5 Ton Freezer Truck"
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        required
                      />
                    </div>
                  </>
                )}

                {activeTab === "employees" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Legal Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Kamal Addarachchi"
                        required
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          NIC Entry
                        </label>
                        <input
                          type="text"
                          placeholder="199200000000"
                          required
                          value={formData.nic || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, nic: e.target.value })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Direct Mobile
                        </label>
                        <input
                          type="tel"
                          placeholder="077-XXXXXXX"
                          required
                          value={formData.phoneno || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phoneno: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "sales-reps" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Registry ID
                        </label>
                        <input
                          type="text"
                          placeholder="REP-01"
                          required
                          value={formData.rep_id || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, rep_id: e.target.value })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Rep Name
                        </label>
                        <input
                          type="text"
                          placeholder="Display Name"
                          required
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Supplier Entity
                        </label>
                        <select
                          required
                          value={formData.supplier_id || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              supplier_id: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 bg-white"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Assigned Route
                        </label>
                        <select
                          required
                          value={formData.route_id || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              route_id: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 bg-white"
                        >
                          <option value="">Select Route</option>
                          {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.route_code}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Primary Contact
                        </label>
                        <input
                          type="text"
                          placeholder="Contact No"
                          value={formData.contact || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contact: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                          Joined Date
                        </label>
                        <input
                          type="date"
                          value={formData.join_date || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              join_date: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 px-w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  {editingId ? "Save Changes" : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
