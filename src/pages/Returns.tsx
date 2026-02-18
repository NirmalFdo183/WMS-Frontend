
import { useState, useEffect } from "react";
import axios from "axios";
import { RefreshCw, Search, Package, CheckCircle } from "lucide-react";
import { useWarehouse } from "../context/WarehouseContext";

interface Loading {
    id: number;
    load_number: string;
    loading_date: string;
    status: string;
    truck?: {
        licence_plate_no: string;
        description: string;
    };
    route?: {
        route_code: string;
        route_description: string;
    };
    loading_items?: any[];
}

const Returns = () => {
    const { refreshTotalValue } = useWarehouse();
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");
    const [loadings, setLoadings] = useState<Loading[]>([]);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Return Processing State
    const [selectedLoading, setSelectedLoading] = useState<Loading | null>(null);
    const [returnQuantities, setReturnQuantities] = useState<{ [key: number]: string }>({});
    const [submittingReturn, setSubmittingReturn] = useState(false);

    // History State
    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [returnsLoading, setReturnsLoading] = useState(false);

    useEffect(() => {
        fetchLoadings();
    }, []);

    useEffect(() => {
        if (activeTab === "history") {
            fetchReturns();
        }
    }, [activeTab]);

    const fetchLoadings = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/loadings`);
            // Filter for delivered or relevant status if needed, currently fetching all
            setLoadings(res.data);
        } catch (err) {
            console.error("Error fetching loadings:", err);
            setLoadingError("Failed to load manifests.");
        }
    };

    const fetchReturns = async () => {
        setReturnsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/returns`);
            setReturnsList(res.data);
        } catch (err) {
            console.error("Error fetching returns:", err);
        } finally {
            setReturnsLoading(false);
        }
    };

    const handleSelectLoading = (loading: Loading) => {
        setSelectedLoading(loading);
        setReturnQuantities({});
    };

    const submitReturns = async () => {
        if (!selectedLoading) return;

        setSubmittingReturn(true);
        try {
            for (const batchIdStr in returnQuantities) {
                const qtyStr = returnQuantities[batchIdStr];
                const qty = parseInt(qtyStr);
                const batchId = parseInt(batchIdStr);

                if (!isNaN(qty) && qty > 0) {
                    await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL}/loadings/${selectedLoading.id}/returns`,
                        {
                            batch_id: batchId,
                            qty: qty,
                            return_date: new Date().toISOString().split('T')[0],
                            reason: 'Return processed via Returns Page',
                        }
                    );
                }
            }

            alert("Returns processed successfully!");
            refreshTotalValue();
            setSelectedLoading(null);
            setReturnQuantities({});
            setActiveTab("history"); // Switch to history to show the new return
        } catch (err: any) {
            console.error("Error processing returns:", err);
            alert(err.response?.data?.message || "Failed to process returns.");
        } finally {
            setSubmittingReturn(false);
        }
    };

    const filteredLoadings = loadings.filter(l =>
        l.load_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.truck?.licence_plate_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.route?.route_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto py-4">
            <div className="mb-4">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">

                    Returns Management
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Process stock returns from delivery trucks and view return history.
                </p>
            </div>

            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-x-auto no-scrollbar max-w-fit">
                <button
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "new" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-500 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab("new")}
                >
                    Create New Return
                </button>
                <button
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "history" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-gray-500 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab("history")}
                >
                    Return History
                </button>
            </div>

            {activeTab === "new" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Select Loading */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-700 mb-2">1. Select Loading Manifest</h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search load #, vehicle..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {loadingError ? (
                                <p className="text-red-500 text-center p-4 text-sm">{loadingError}</p>
                            ) : filteredLoadings.length === 0 ? (
                                <p className="text-gray-400 text-center p-4 text-sm">No loadings found.</p>
                            ) : (
                                filteredLoadings.map(load => (
                                    <div
                                        key={load.id}
                                        onClick={() => handleSelectLoading(load)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedLoading?.id === load.id ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-100 hover:border-orange-200 bg-white'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-blue-600 text-sm">#{load.load_number}</span>
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${load.status === 'delivered' ? 'bg-green-100 text-green-700' : load.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {load.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 font-medium">{load.loading_date}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                                            <Package size={12} />
                                            <span className="truncate">{load.truck?.licence_plate_no}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Return Form */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">2. Select Items to Return</h3>
                            {selectedLoading && (
                                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    Loading #{selectedLoading.load_number}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {!selectedLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Package size={48} className="mb-4 opacity-20" />
                                    <p>Select a loading manifest from the left to start.</p>
                                </div>
                            ) : (selectedLoading.loading_items?.length || 0) === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <p>No items found in this loading.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                                            <th className="py-3 px-2">Product</th>
                                            <th className="py-3 px-2 text-center">Batch</th>
                                            <th className="py-3 px-2 text-center">Loaded Qty</th>
                                            <th className="py-3 px-2 text-center w-32">Return Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-100">
                                        {selectedLoading.loading_items?.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="py-3 px-2">
                                                    <p className="font-bold text-gray-800">{item.batch_stock?.product?.name}</p>
                                                    <p className="text-xs text-gray-400">{item.batch_stock?.product?.barcode}</p>
                                                </td>
                                                <td className="py-3 px-2 text-center text-xs text-gray-500 font-mono">
                                                    {item.batch_stock?.batch_number || `ID:${item.batch_id}`}
                                                </td>
                                                <td className="py-3 px-2 text-center font-bold text-gray-700">
                                                    {item.qty}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.qty}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-center font-bold outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-all"
                                                        placeholder="0"
                                                        value={returnQuantities[item.batch_stock?.id] || ''}
                                                        onChange={(e) => {
                                                            let val = parseInt(e.target.value);
                                                            if (isNaN(val) || val < 0) val = 0;
                                                            if (val > item.qty) val = item.qty;
                                                            setReturnQuantities({
                                                                ...returnQuantities,
                                                                [item.batch_stock?.id]: val.toString()
                                                            });
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={submitReturns}
                                disabled={!selectedLoading || submittingReturn}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingReturn ? 'Processing...' : 'Confirm Returns'}
                                <CheckCircle size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700">All Returns History</h3>
                        <button
                            onClick={fetchReturns}
                            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={returnsLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Loading Ref</th>
                                    <th className="px-6 py-4">Product</th>
                                    <th className="px-6 py-4 text-center">Qty Returned</th>
                                    <th className="px-6 py-4">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {returnsLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading history...</td></tr>
                                ) : returnsList.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No returns found.</td></tr>
                                ) : (
                                    returnsList.map((ret: any) => (
                                        <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{ret.return_date}</td>
                                            <td className="px-6 py-4 text-blue-600 font-bold">#{ret.loading?.load_number}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800">{ret.batch_stock?.product?.name}</p>
                                                <p className="text-xs text-gray-400 font-mono">{ret.batch_stock?.product?.barcode}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs">
                                                    {ret.qty}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 italic text-xs">{ret.reason || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
