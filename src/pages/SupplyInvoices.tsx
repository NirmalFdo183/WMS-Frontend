import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
    const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`);
            setInvoices(res.data);
        } catch (err) {
            console.error("Error fetching invoices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

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
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Supply Invoices Report</h1>
                    <p className="text-gray-500">History of all inventory stock updates</p>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search invoice or supplier..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Search size={18} />
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
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

            {/* DELETE CONFIRMATION MODAL */}
            {invoiceToDelete && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Delete Invoice?</h3>
                            <p className="text-sm text-gray-500 mb-8">This action cannot be undone. All stock items associated with this invoice will also be removed.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setInvoiceToDelete(null)}
                                    className="py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteInvoice}
                                    className="py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-100 transition-all"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
                                <p className="text-blue-600 font-mono font-bold">#{selectedInvoice.invoice_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            {modalLoading ? (
                                <div className="py-20 text-center text-gray-500 font-bold">Fetching items...</div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Summary Bar */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Supplier</p>
                                            <p className="text-lg font-bold text-gray-800">{selectedInvoice.supplier?.name || selectedInvoice.supplier_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Billing Date</p>
                                            <p className="text-lg font-bold text-gray-800">{selectedInvoice.invoice_date}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Discount Applied</p>
                                            <p className="text-lg font-bold text-red-500">Rs. {Number(selectedInvoice.discount).toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Invoice Total</p>
                                            <p className="text-2xl font-black text-blue-700">Rs. {Number(selectedInvoice.total_bill_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Stocked Items List</h3>
                                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                                            <table className="w-full text-left">
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
