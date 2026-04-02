import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Edit2, Trash2, Search } from "lucide-react";

interface BatchStock {
    id: number;
    product: {
        name: string;
        material_code: string;
    };
    no_cases: number;
    pack_size: number;
    qty: number;
    retail_price: number;
    netprice: number;
    expiry_date: string;
}

interface SupplierInvoice {
    id: number;
    invoice_number: string;
    invoice_date: string;
    total_bill_amount: number;
    discount: number;
    supplier_id: number;
    supplier?: {
        name: string;
    };
    batch_stocks?: BatchStock[];
}

const SupplyInvoices = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"supply" | "shop" | "loading">("supply");
    const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

    // Initial Tab Selection from Navigation State
    useEffect(() => {
        if (location.state && location.state.activeTab) {
            setActiveTab(location.state.activeTab);
            // Clear state so it doesn't persist on refresh if not intended, 
            // though for keeping tab active on refresh we'd need URL params. 
            // For now, this handles the redirect from creation page.
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Loading State
    const [loadings, setLoadings] = useState<any[]>([]);
    const [loadingToDelete, setLoadingToDelete] = useState<number | null>(null);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const [supplyRes, loadingRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`),
                axios.get(`${import.meta.env.VITE_API_BASE_URL}/loadings`)
            ]);
            setInvoices(supplyRes.data);
            setLoadings(loadingRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // ... (rest of the existing handlers)

    const handleInvoiceClick = async (id: number) => {
        try {
            setModalLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${id}`);
            setSelectedInvoice(res.data);
        } catch (err) {
            console.error("Error fetching invoice details:", err);
            alert("Failed to load invoice details.");
        } finally {
            setModalLoading(false);
        }
    };

    const deleteLoading = async () => {
        if (!loadingToDelete) return;
        try {
            setLoading(true);
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/loadings/${loadingToDelete}`);
            setLoadings(loadings.filter(l => l.id !== loadingToDelete));
            setLoadingToDelete(null);
        } catch (err) {
            console.error("Error deleting loading:", err);
            alert("Failed to delete loading.");
        } finally {
            setLoading(false);
        }
    };

    const LoadingTable = () => {
        if (loading) return <div className="p-10 text-center text-gray-500">Loading data...</div>;
        if (loadings.length === 0) return <div className="p-10 text-center text-gray-500">No loading manifests found.</div>;

        return (
            <table className="w-full text-left min-w-[800px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <th className="px-6 py-4">Load Number</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Truck</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Total Items</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loadings.map((load) => (
                        <tr key={load.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-blue-600">#{load.load_number}</td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{load.loading_date}</td>
                            <td className="px-6 py-4 font-semibold text-gray-800 text-sm">
                                {load.truck?.truck_number} <span className="text-gray-400 font-normal">({load.truck?.driver_name})</span>
                            </td>
                            <td className="px-6 py-4 text-gray-800 text-sm">{load.route?.route_name}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                    ${load.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        load.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {load.status.replace("_", " ")}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-gray-700">
                                {load.loading_items?.reduce((sum: number, item: any) => sum + (Number(item.qty) + (Number(item.free_qty) || 0)), 0) || 0}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                        title="Edit Loading"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setLoadingToDelete(load.id)}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Delete Loading"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const handleDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            setLoading(true);
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${invoiceToDelete}`);
            setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete));
            setInvoiceToDelete(null);
        } catch (err) {
            console.error("Error deleting invoice:", err);
            alert("Failed to delete invoice. It might have linked stock items.");
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(
        (inv) =>
            inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Invoices</h1>
                <p className="text-gray-500 text-sm">View and manage all types of invoices</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                <button
                    className={`px-4 sm:px-6 py-3 font-medium text-sm focus:outline-none whitespace-nowrap transition-all ${activeTab === "supply" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab("supply")}
                >
                    Supply Invoices
                </button>
                <button
                    className={`px-4 sm:px-6 py-3 font-medium text-sm focus:outline-none whitespace-nowrap transition-all ${activeTab === "shop" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab("shop")}
                >
                    Shop Invoices
                </button>
                <button
                    className={`px-4 sm:px-6 py-3 font-medium text-sm focus:outline-none whitespace-nowrap transition-all ${activeTab === "loading" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab("loading")}
                >
                    Loading Invoices
                </button>
            </div>

            {activeTab === "supply" && (
                <>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Supply Invoices Report</h2>
                            <p className="text-sm text-gray-500">History of all inventory stock updates</p>
                        </div>

                        <div className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search invoice or supplier..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none w-full sm:w-80 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search size={18} />
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
                                    <th className="px-6 py-4 text-left">Invoice No</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Supplier</th>
                                    <th className="px-6 py-4 text-right">Discount</th>
                                    <th className="px-6 py-4 text-right">Total Amount</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading invoices...</td>
                                    </tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No invoices found.</td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                            onClick={() => handleInvoiceClick(inv.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-blue-600">#{inv.invoice_number}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-600">{inv.invoice_date}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-gray-800">{inv.supplier?.name || `ID: ${inv.supplier_id}`}</td>
                                            <td className="px-6 py-4 text-right text-red-500 font-medium">Rs. {Number(inv.discount).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-900">Rs. {Number(inv.total_bill_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleInvoiceClick(inv.id);
                                                        }}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate("/new-supply", { state: { invoiceId: inv.id } });
                                                        }}
                                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                        title="Continue Adding Stock"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInvoiceToDelete(inv.id);
                                                        }}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === "shop" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Shop Invoices</h3>
                    <p className="text-gray-500 mt-2">This module is under development. You will be able to view and manage shop invoices here soon.</p>
                </div>
            )}

            {activeTab === "loading" && (
                <>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Loading Manifests</h2>
                            <p className="text-sm text-gray-500">History of outbound truck loads</p>
                        </div>
                        <button
                            onClick={() => navigate('/loading')}
                            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition"
                        >
                            + New Loading
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto no-scrollbar">
                        <LoadingTable />
                    </div>
                </>
            )}


            {/* DELETE CONFIRMATION MODAL */}
            {(invoiceToDelete || loadingToDelete) && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="p-6 sm:p-8 text-center">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                <Trash2 size={24} className="sm:hidden" />
                                <Trash2 size={32} className="hidden sm:block" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{loadingToDelete ? "Delete Manifest?" : "Delete Invoice?"}</h3>
                            <p className="text-sm text-gray-500 mb-6 sm:mb-8">This action cannot be undone. All associated data will be removed.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setInvoiceToDelete(null);
                                        setLoadingToDelete(null);
                                    }}
                                    className="py-2.5 sm:py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={loadingToDelete ? deleteLoading : handleDeleteInvoice}
                                    className="py-2.5 sm:py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 transition-all font-mono"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 text-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="px-5 sm:px-8 py-4 sm:py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Invoice Details</h2>
                                <p className="text-blue-600 font-mono font-bold text-xs sm:text-sm">#{selectedInvoice.invoice_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 sm:p-8 overflow-y-auto">
                            {modalLoading ? (
                                <div className="py-20 text-center text-gray-500 font-bold">Fetching items...</div>
                            ) : (
                                <div className="space-y-6 sm:space-y-8">
                                    {/* Summary Bar */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-blue-50/50 p-4 sm:p-6 rounded-xl border border-blue-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Supplier</p>
                                            <p className="text-sm sm:text-lg font-bold text-gray-800 truncate">{selectedInvoice.supplier?.name || selectedInvoice.supplier_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Billing Date</p>
                                            <p className="text-sm sm:text-lg font-bold text-gray-800">{selectedInvoice.invoice_date}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Discount</p>
                                            <p className="text-sm sm:text-lg font-bold text-red-500">Rs. {Number(selectedInvoice.discount).toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Invoice Total</p>
                                            <p className="text-lg sm:text-2xl font-bold text-blue-700">Rs. {Number(selectedInvoice.total_bill_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Stocked Items List</h3>
                                        <div className="border border-gray-100 rounded-xl overflow-x-auto no-scrollbar">
                                            <table className="w-full text-left min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                        <th className="px-6 py-4">Product Specs</th>
                                                        <th className="px-4 py-4 text-center">Batch Vol.</th>
                                                        <th className="px-4 py-4 text-center">Total Units</th>
                                                        <th className="px-4 py-4 text-right">Net Price</th>
                                                        <th className="px-4 py-4 text-right">Retail Price</th>
                                                        <th className="px-6 py-4 text-right">Line Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {selectedInvoice.batch_stocks?.map((item) => (
                                                        <tr key={item.id} className="text-xs hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-gray-800">{item.product.name}</p>
                                                                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{item.product.material_code}</p>
                                                                {item.expiry_date && (
                                                                    <p className="text-[10px] text-gray-500 mt-1">EXP: {item.expiry_date}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center font-medium text-gray-500">
                                                                {item.no_cases} × {item.pack_size}
                                                            </td>
                                                            <td className="px-4 py-4 text-center font-bold text-gray-900">{item.qty}</td>
                                                            <td className="px-4 py-4 text-right font-medium">Rs. {Number(item.netprice).toFixed(2)}</td>
                                                            <td className="px-4 py-4 text-right font-medium">Rs. {Number(item.retail_price).toFixed(2)}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                                Rs. {(Number(item.qty) * Number(item.netprice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplyInvoices;
