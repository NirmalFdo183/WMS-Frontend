import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  material_code: string;
  category: string;
}

interface Supplier {
  id: number;
  name: string;
  contactno: string;
  address: string;
}

interface BatchItem {
  temp_id: number;
  product_id: number;
  product_name: string;
  material_code: string;
  no_cases: number;
  pack_size: number;
  qty: number;
  retail_price: number;
  netprice: number;
  expiry_date: string;
}

const NewSupply = () => {
  const navigate = useNavigate();

  // Navigation State
  const [step, setStep] = useState<"invoice" | "items">("invoice");

  // Invoice State
  const [invoiceData, setInvoiceData] = useState({
    supplier_id: "",
    supplier_name: "",
    invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    discount: "0",
    total_bill_amount: "",
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Items State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  // Batch Entry State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [batchForm, setBatchForm] = useState({
    no_cases: "",
    pack_size: "",
    retail_price: "",
    net_price: "",
    expiry_date: "",
  });

  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for scanner support
  useEffect(() => {
    if (step === 'items' && !activeProduct && !showAddProductModal && !showConfirmSave && !showConfirmCancel) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step, activeProduct, showAddProductModal, showConfirmSave, showConfirmCancel]);

  // Fetch Data
  const fetchData = async () => {
    try {
      const [prodRes, suppRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`)
      ]);
      setProducts(prodRes.data);
      setSuppliers(suppRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search Logic
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    // Direct Match (QR/Barcode) - material_code
    const directMatch = products.find(
      (p) => p.material_code.toLowerCase() === searchTerm.toLowerCase()
    );

    if (directMatch) {
      handleSelectProduct(directMatch);
      setSearchTerm("");
      return;
    }

    // Fuzzy Match
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(filtered);

    // Auto-open create modal if length > 5 and NO results (QR/Barcode scanned)
    if (searchTerm.length > 5 && filtered.length === 0) {
      setNewProduct({ ...newProduct, material_code: searchTerm });
      setShowAddProductModal(true);
      setSearchTerm("");
    }
  }, [searchTerm, products]);

  const handleSelectProduct = (product: Product) => {
    setActiveProduct(product);
    setSearchResults([]);
    setSearchTerm("");
  };

  const handleProceedToItems = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create Invoice immediately in database
      const payload = {
        supplier_id: Number(invoiceData.supplier_id),
        invoice_number: invoiceData.invoice_no,
        invoice_date: invoiceData.invoice_date,
        discount: Number(invoiceData.discount || 0),
        total_bill_amount: invoiceData.total_bill_amount ? Number(invoiceData.total_bill_amount) : 0,
      };
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/supplier-invoices`, payload);
      setSavedInvoiceId(res.data.id);
      setStep("items");
    } catch (err: any) {
      console.error("Invoice creation error:", err);
      alert(err.response?.data?.message || "Failed to initialize invoice in database. Check if Invoice Number is unique.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !savedInvoiceId) return;

    setLoading(true);
    const cases = Number(batchForm.no_cases);
    const pSize = Number(batchForm.pack_size);
    const qty = cases * pSize;

    try {
      const payload = {
        product_id: activeProduct.id,
        supplier_invoice_id: savedInvoiceId,
        no_cases: cases,
        pack_size: pSize,
        qty: qty,
        retail_price: Number(batchForm.retail_price),
        netprice: Number(batchForm.net_price),
        expiry_date: batchForm.expiry_date || null,
      };

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks`, payload);

      const newItem: BatchItem = {
        temp_id: res.data.id, // Use real DB ID
        product_id: activeProduct.id,
        product_name: activeProduct.name,
        material_code: activeProduct.material_code,
        no_cases: cases,
        pack_size: pSize,
        qty: qty,
        retail_price: Number(batchForm.retail_price),
        netprice: Number(batchForm.net_price),
        expiry_date: batchForm.expiry_date,
      };

      setBatchItems([...batchItems, newItem]);
      setActiveProduct(null);
      setBatchForm({
        no_cases: "",
        pack_size: "",
        retail_price: "",
        net_price: "",
        expiry_date: "",
      });
    } catch (err) {
      console.error("Error adding batch to DB:", err);
      alert("Failed to save stock item to database.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/batch-stocks/${id}`);
      setBatchItems(batchItems.filter((i) => i.temp_id !== id));
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to remove item from database.");
    }
  };

  const handleCompleteSupply = async () => {
    alert("Invoice successfully saved!");
    resetForm();
    navigate("/dashboard");
  };

  const resetForm = () => {
    setStep("invoice");
    setInvoiceData({
      ...invoiceData,
      invoice_no: "",
      invoice_date: new Date().toISOString().split("T")[0],
      discount: "0",
      total_bill_amount: "",
    });
    setBatchItems([]);
    setSavedInvoiceId(null);
    setActiveProduct(null);
    setShowConfirmCancel(false);
  };

  const calculateTotal = () => {
    if (invoiceData.total_bill_amount) return Number(invoiceData.total_bill_amount);
    const subtotal = batchItems.reduce((sum, item) => sum + item.qty * item.netprice, 0);
    return subtotal - Number(invoiceData.discount || 0);
  };

  const calculateTotalQty = () => {
    return batchItems.reduce((sum, item) => sum + item.qty, 0);
  };

  // Add New Product Modal fields
  const [newProduct, setNewProduct] = useState({
    name: "",
    material_code: "",
    category: "General",
  });

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/products`, newProduct);
      setProducts([...products, res.data]);
      setShowAddProductModal(false);
      handleSelectProduct(res.data);
      setNewProduct({ name: "", material_code: "", category: "General" });
    } catch (err) {
      console.error("Error creating product:", err);
      alert("Failed to create product.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6 font-sans text-gray-900">
      {/* Header Container */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">New Supply Entry</h1>
            <p className="text-sm text-gray-500">Record and automate incoming inventory stock</p>
          </div>

          {step === "items" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmCancel(true)}
                className="px-4 py-2 rounded-lg font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel Entry
              </button>
              <button
                onClick={() => setShowConfirmSave(true)}
                disabled={batchItems.length === 0}
                className="px-5 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                Complete Invoice
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {step === "invoice" ? (
          // STEP 1: Invoice Details - Formal Card
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">Invoice Preliminary Details</h2>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleProceedToItems}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Supplier Name</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={invoiceData.supplier_id}
                    required
                    onChange={(e) => {
                      const selected = suppliers.find(s => s.id.toString() === e.target.value);
                      setInvoiceData({
                        ...invoiceData,
                        supplier_id: e.target.value,
                        supplier_name: selected ? selected.name : ""
                      });
                    }}
                  >
                    <option value="">Select a Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Invoice Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-9982"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.invoice_no}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_no: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Invoice Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.invoice_date}
                      onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Discount Amount (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rs.</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.discount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, discount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">Total Bill Amount (Manual Override)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rs.</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Leave blank to auto-calculate"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.total_bill_amount}
                      onChange={(e) => setInvoiceData({ ...invoiceData, total_bill_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? "Initializing..." : "Proceed to Item Entry"}
              </button>
            </form>
          </div>
        ) : (
          // STEP 2: Adding Items
          <div className="space-y-4">
            {/* Invoice Info Bar */}
            <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 items-center">
              <div className="flex flex-wrap gap-8 py-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier</p>
                    <p className="font-bold text-gray-800 text-sm leading-tight">{invoiceData.supplier_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice ID</p>
                  <p className="font-bold text-blue-700 text-sm leading-tight">#{invoiceData.invoice_no}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Billing Date</p>
                  <p className="font-bold text-gray-800 text-sm leading-tight">{invoiceData.invoice_date}</p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-6 border-l pl-6 border-gray-100 py-1">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items Count</p>
                  <p className="text-base font-bold text-gray-800 leading-tight">{batchItems.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice Value</p>
                  <p className="text-base font-bold text-blue-700 leading-tight">Rs. {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Search Panel - Full Width */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="relative text-sm max-w-2xl">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium h-12"
                    placeholder="Scan Barcode / QR or Search Product Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  {/* Results Overlay */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors"
                        >
                          <div className="text-xs">
                            <p className="font-bold text-gray-800">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.material_code}</p>
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 text-[10px] font-bold">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Added Items Table - Full Width */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Inventory Entry Rows</h3>
                  <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-bold">L: {batchItems.length}</span>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        <th className="px-5 py-3">Product Specifications</th>
                        <th className="px-4 py-3 text-center">Batch Vol.</th>
                        <th className="px-4 py-3 text-center">Units</th>
                        <th className="px-4 py-3 text-right">Unit Pricing</th>
                        <th className="px-5 py-3 text-right">Line Value</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {batchItems.map((item) => (
                        <tr key={item.temp_id} className="group hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-gray-800">{item.product_name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded">{item.material_code}</span>
                              <span className={`text-[10px] px-1 rounded font-bold ${item.expiry_date && new Date(item.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
                                EXP: {item.expiry_date || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-[10px] font-bold text-gray-500">{item.no_cases} × {item.pack_size}</span>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-900">
                            {item.qty}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-[9px] text-gray-400 font-bold uppercase">Net Cost: <span className="text-blue-600">{item.netprice.toFixed(2)}</span></div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase">Retail: <span className="text-gray-700">{item.retail_price.toFixed(2)}</span></div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className="font-bold text-gray-900">{(item.qty * item.netprice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.temp_id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-white rounded border border-transparent hover:border-red-100 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {batchItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-24 text-center">
                            <div className="flex flex-col items-center justify-center opacity-30">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Entry Table Empty</p>
                              <p className="text-xs">Scan items to add them to this invoice</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {batchItems.length > 0 && (
                  <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row md:items-center gap-4 mt-auto">
                    <div className="flex items-center gap-6">
                      <div className="text-left border-r pr-6 border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Units</p>
                        <p className="text-xl font-bold text-gray-800 mt-1">{calculateTotalQty()}</p>
                      </div>
                    </div>
                    <div className="md:ml-auto text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">AGGREGATE SUM</p>
                      <p className="text-2xl font-bold text-blue-700 leading-none">Rs. {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW BATCH POPUP MODAL */}
      {activeProduct && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Stocking Details</p>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">{activeProduct.name}</h4>
                <p className="text-[10px] text-gray-400 font-mono mt-1">CODE: {activeProduct.material_code}</p>
              </div>
              <button onClick={() => setActiveProduct(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Inner Packs/Cases</label>
                  <input
                    type="number" required min="1" autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-base"
                    value={batchForm.no_cases}
                    onChange={(e) => setBatchForm({ ...batchForm, no_cases: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Units per Pack</label>
                  <input
                    type="number" required min="1"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-base"
                    value={batchForm.pack_size}
                    onChange={(e) => setBatchForm({ ...batchForm, pack_size: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center py-3 px-4 bg-blue-50 rounded-xl text-blue-700 font-bold border border-blue-100">
                <span className="text-[11px] uppercase tracking-widest">Total Batch Quantity</span>
                <span className="text-xl">{(Number(batchForm.no_cases) || 0) * (Number(batchForm.pack_size) || 0)} Units</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Net Unit Cost (Rs.)</label>
                  <input
                    type="number" required step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-base"
                    value={batchForm.net_price}
                    onChange={(e) => setBatchForm({ ...batchForm, net_price: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">Retail Price (Rs.)</label>
                  <input
                    type="number" required step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-base"
                    value={batchForm.retail_price}
                    onChange={(e) => setBatchForm({ ...batchForm, retail_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-600 ml-0.5">Expiry Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-bold text-base"
                  value={batchForm.expiry_date}
                  onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setActiveProduct(null)} className="flex-1 py-3.5 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl text-xs uppercase tracking-wide hover:bg-gray-50 transition-colors">Abort</button>
                <button type="submit" disabled={loading} className="flex-[2] py-3.5 font-bold text-white bg-blue-600 rounded-xl text-xs uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50">
                  {loading ? "Adding..." : "Add to Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 text-center mb-2">Finalize Entry?</h3>
              <p className="text-sm text-gray-500 text-center mb-8">All items have been saved to the database. Clicking Complete will finalize the session.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowConfirmSave(false)} className="py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100">Back</button>
                <button
                  onClick={handleCompleteSupply}
                  className="py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all flex justify-center items-center"
                >
                  Confirm Completion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 text-center">
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Discard Entry?</h3>
              <p className="text-sm text-gray-500 mb-8">All progress for invoice <b>{invoiceData.invoice_no}</b> will be lost permanently.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowConfirmCancel(false)} className="py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100">Keep Editing</button>
                <button onClick={resetForm} className="py-3 font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-100 transition-all">Discard All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 text-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-700 uppercase tracking-widest text-xs">Master Inventory Registry</h3>
            </div>
            <form onSubmit={handleAddNewProduct} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-600 ml-0.5">Product Name</label>
                <input
                  type="text" required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all outline-none font-bold"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-gray-600 ml-0.5">Material Code / Barcode / SKU</label>
                <input
                  type="text" required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 transition-all outline-none font-mono font-bold"
                  value={newProduct.material_code}
                  onChange={(e) => setNewProduct({ ...newProduct, material_code: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowAddProductModal(false)} className="flex-1 py-3 font-bold text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-100 transition-all">Create Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSupply;
