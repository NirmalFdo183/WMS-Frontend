import { useState, useEffect } from "react";
import axios from "axios";

// Interfaces
interface Route {
  id: number;
  route_code: string;
  route_description: string;
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
  name: string;
  email: string;
  phone: string;
}

const Resources = () => {
  // State management for tabs
  const [activeTab, setActiveTab] = useState<
    "routes" | "trucks" | "employees" | "salesReps"
  >("routes");

  // Data States
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);

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
    // Placeholder for future API integration
    setSalesReps([
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: "0771234567",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "0719876543",
      },
    ]);
  };

  useEffect(() => {
    if (activeTab === "routes") fetchRoutes();
    else if (activeTab === "trucks") fetchTrucks();
    else if (activeTab === "employees") fetchEmployees();
    else if (activeTab === "salesReps") fetchSalesReps();
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
      setFormData(item || { name: "", email: "", phone: "" });
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

    if (activeTab === "salesReps") {
      alert("Sales Rep API not connected yet!");
      closeModal();
      return;
    }

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
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Operation failed. Please check inputs.");
    }
  };

  // Delete Handler
  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure?")) return;

    if (activeTab === "salesReps") {
      alert("Sales Rep API not connected yet!");
      return;
    }

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/${activeTab}/${id}`,
      );
      if (activeTab === "routes") fetchRoutes();
      if (activeTab === "trucks") fetchTrucks();
      if (activeTab === "employees") fetchEmployees();
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
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Add{" "}
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
          className={`px-4 py-2 font-medium text-sm focus:outline-none whitespace-nowrap ${activeTab === "salesReps" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setActiveTab("salesReps")}
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
                    <button
                      onClick={() => openModal(r)}
                      className="text-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
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
                    <button
                      onClick={() => openModal(t)}
                      className="text-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
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
                    <button
                      onClick={() => openModal(e)}
                      className="text-blue-600 mr-2 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
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

        {activeTab === "salesReps" && (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesReps.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4">{s.name}</td>
                  <td className="px-6 py-4">{s.email}</td>
                  <td className="px-6 py-4">{s.phone}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(s)}
                      className="text-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {salesReps.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
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

              {activeTab === "salesReps" && (
                <>
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
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
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
