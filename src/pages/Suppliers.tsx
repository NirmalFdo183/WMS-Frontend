import { useState, useEffect } from "react";
import axios from "axios";

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
        address: ""
    });

    const fetchSuppliers = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`);
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
            address: supplier.address || ""
        });
        setShowModal(true);
    };

    const handleDeleteSupplier = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) return;

        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/suppliers/${id}`);
            setSuppliers(suppliers.filter(s => s.id !== id));
        } catch (err) {
            console.error("Error deleting supplier:", err);
            alert("Failed to delete supplier");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/suppliers/${editingSupplier.id}`, formData);
                setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? res.data : s));
            } else {
                const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/suppliers`, formData);
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
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-12">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Suppliers</h1>
                    <p className="text-gray-500 mt-2">Manage your relationship with product suppliers</p>
                </div>
                <button
                    onClick={() => {
                        setEditingSupplier(null);
                        setFormData({ name: "", contactno: "", address: "" });
                        setShowModal(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all hover:bg-blue-700 hover:shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Supplier
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {suppliers.map((supplier) => (
                        <div key={supplier.id} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <span className="text-2xl">🏢</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditClick(supplier)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Supplier"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSupplier(supplier.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Supplier"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{supplier.name}</h3>
                            <div className="space-y-3 mt-6">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-sm font-medium">{supplier.contactno || 'No contact'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-sm font-medium">{supplier.address || 'No address'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-2xl font-bold text-gray-900">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Supplier Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium"
                                    placeholder="e.g. Hemas Pharmaceuticals"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium"
                                    placeholder="e.g. +94 112 345 678"
                                    value={formData.contactno}
                                    onChange={(e) => setFormData({ ...formData, contactno: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Business Address</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium min-h-[100px]"
                                    placeholder="Full business address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-4 border border-gray-200 font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                >
                                    {editingSupplier ? 'Update Supplier' : 'Register Supplier'}
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
