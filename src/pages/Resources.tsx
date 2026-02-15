import { useState, useEffect } from "react";
import axios from "axios";
import { Edit2, Trash2, Plus } from "lucide-react";

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
  role: "warehouse_helper" | "cash_collecter" | "helper" | "driver";
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
    if (activeTab === "routes") fetchRoutes();
    else if (activeTab === "trucks") fetchTrucks();
    else if (activeTab === "employees") fetchEmployees();
    else if (activeTab === "sales-reps") {
      fetchSalesReps();
      fetchSuppliers();
      fetchRoutes();
    }
  }, [activeTab]);

  // Modal Handlers
  const openModal = (item: any = null) => {
    setEditingId(item ? item.id : null);
    if (activeTab === "routes") {
      setFormData(item || { route_code: "", route_description: "" });
    } else if (activeTab === "trucks") {
      setFormData(item || { licence_plate_no: "", description: "" });
    } else if (activeTab === "employees") {
      setFormData(
        item || { name: "", nic: "", role: "warehouse_helper", phoneno: "" },
      );
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Resource Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage Routes, Trucks, and Sales Representatives
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold transition-all hover:bg-blue-700 hover:shadow-lg shadow-blue-200 flex items-center gap-2 text-sm"
        >
          <Plus size={18} />
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
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === "routes" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("routes")}
        >
          Routes
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === "trucks" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("trucks")}
        >
          Trucks
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === "employees" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === "sales-reps" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("sales-reps")}
        >
          Sales Reps
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {activeTab === "routes" && (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">Route Code</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {routes.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 font-mono">{r.route_code}</td>
                  <td className="px-6 py-4">{r.route_description}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(r)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit Route"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Route"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No routes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "trucks" && (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">License Plate</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trucks.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 font-mono">{t.licence_plate_no}</td>
                  <td className="px-6 py-4">{t.description || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(t)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit Truck"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Truck"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {trucks.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No trucks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "employees" && (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">NIC</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {e.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{e.nic}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {e.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">{e.phoneno}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(e)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit Employee"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "sales-reps" && (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">Rep ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesReps.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 font-mono text-sm">{s.rep_id}</td>
                  <td className="px-6 py-4 font-bold">{s.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {s.supplier?.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {s.route?.route_code}
                  </td>
                  <td className="px-6 py-4">{s.contact}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(s)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        title="Edit Sales Rep"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Delete Sales Rep"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {salesReps.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No sales reps found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit" : "Add"}{" "}
              {activeTab === "routes"
                ? "Route"
                : activeTab === "trucks"
                  ? "Truck"
                  : activeTab === "employees"
                    ? "Employee"
                    : "Sales Rep"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === "routes" && (
                <>
                  <input
                    type="text"
                    placeholder="Route Code"
                    required
                    value={formData.route_code || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, route_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    required
                    value={formData.route_description || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        route_description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </>
              )}

              {activeTab === "trucks" && (
                <>
                  <input
                    type="text"
                    placeholder="License Plate No"
                    required
                    value={formData.licence_plate_no || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licence_plate_no: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </>
              )}

              {activeTab === "employees" && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="NIC Number"
                    required
                    value={formData.nic || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nic: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <select
                    value={formData.role || "warehouse_helper"}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="warehouse_helper">Warehouse Helper</option>
                    <option value="cash_collecter">Cash Collecter</option>
                    <option value="helper">Helper</option>
                    <option value="driver">Driver</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phoneno || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneno: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </>
              )}

              {activeTab === "sales-reps" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Rep ID"
                      required
                      value={formData.rep_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rep_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      required
                      value={formData.supplier_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      required
                      value={formData.route_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, route_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">Select Route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.route_code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Contact No"
                      value={formData.contact || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, contact: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="date"
                      placeholder="Join Date"
                      value={formData.join_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, join_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
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
