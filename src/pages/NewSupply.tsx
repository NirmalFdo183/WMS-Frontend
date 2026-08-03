import { useState, useEffect, useRef } from "react";
import { useWarehouse } from "../context/WarehouseContext";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

interface Product {
  id: number;
  name: string;
  material_code: string;
  barcode: string;
  supplier_id: number;
  supplier?: {
    id: number;
    name: string;
  };
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
  barcode: string;
  no_cases: number;
  pack_size: number;
  extra_units: number;
  qty: number;
  free_qty: number;
  retail_price: number;
  netprice: number;
  expiry_date: string;
}

const NewSupply = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editInvoiceId = location.state?.invoiceId;

  // Navigation State
  const { refreshTotalValue } = useWarehouse();
  const [step, setStep] = useState<"invoice" | "items">("invoice");
  const [originalInvoiceTotal, setOriginalInvoiceTotal] = useState<number>(0);

  // Invoice State
  const [invoiceData, setInvoiceData] = useState({
    supplier_id: "",
    supplier_name: "",
    invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    total_bill_amount: "",
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Items State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Batch Entry State
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [batchForm, setBatchForm] = useState({
    no_cases: "",
    pack_size: "",
    extra_units: "0",
    free_qty: "0",
    retail_price: "",
    net_price: "",
    expiry_date: "",
  });

  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for scanner support
  useEffect(() => {
    if (
      step === "items" &&
      !activeProduct &&
      !showAddProductModal &&
      !showConfirmSave &&
      !showConfirmCancel
    ) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [
    step,
    activeProduct,
    showAddProductModal,
    showConfirmSave,
    showConfirmCancel,
  ]);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, suppRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/products`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/suppliers`),
      ]);
      setProducts(prodRes.data);
      setSuppliers(suppRes.data);

      // If editing, fetch invoice details
      if (editInvoiceId) {
        const invRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/supplier-invoices/${editInvoiceId}`,
        );
        const inv = invRes.data;

        setInvoiceData({
          supplier_id: inv.supplier_id.toString(),
          supplier_name: inv.supplier?.name || "",
          invoice_no: inv.invoice_number,
          invoice_date: inv.invoice_date,
          total_bill_amount: inv.total_bill_amount.toString(),
        });
        setOriginalInvoiceTotal(inv.total_bill_amount);

        const items = inv.batch_stocks.map((bs: any) => ({
          temp_id: bs.id,
          product_id: bs.product_id,
          product_name: bs.product?.name || "Unknown Product",
          material_code: bs.product?.material_code || "",
          barcode: bs.product?.barcode || "",
          no_cases: bs.no_cases,
          pack_size: bs.pack_size,
          qty: bs.qty,
          retail_price: bs.retail_price,
          netprice: bs.netprice,
          expiry_date: bs.expiry_date || "",
        }));

        setBatchItems(items);
        setStep("items");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
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

    const directMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()) ||
        p.material_code.toLowerCase() === searchTerm.toLowerCase(),
    );

    if (directMatch) {
      handleSelectProduct(directMatch);
      setSearchTerm("");
      return;
    }

    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode &&
          p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.material_code.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setSearchResults(filtered);
    setHighlightedIndex(-1);

    if (searchTerm.length > 5 && filtered.length === 0) {
      setNewProduct({
        ...newProduct,
        material_code: searchTerm,
        barcode: searchTerm,
        supplier_id: Number(invoiceData.supplier_id),
      });
      setShowAddProductModal(true);
      setSearchTerm("");
    }
  }, [searchTerm, products]);

  const handleSelectProduct = (product: Product) => {
    setActiveProduct(product);
    setSearchResults([]);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelectProduct(searchResults[highlightedIndex]);
      } else if (searchResults.length === 1) {
        handleSelectProduct(searchResults[0]);
      }
    } else if (e.key === "Escape") {
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  };

  const handleProceedToItems = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceData.supplier_id || !invoiceData.invoice_no) {
      alert("Please fill in the required invoice details.");
      return;
    }
    setOriginalInvoiceTotal(Number(invoiceData.total_bill_amount || 0));
    setStep("items");
  };

  // Enter key handler: move to next input instead of submitting
  const handleBatchFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;
      const inputs = Array.from(
        form.querySelectorAll("input, select, textarea"),
      ) as HTMLElement[];
      const idx = inputs.indexOf(e.currentTarget);
      if (idx >= 0 && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    }
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    const cases = Number(batchForm.no_cases || 0);
    const pSize = Number(batchForm.pack_size || 0);
    const extras = Number(batchForm.extra_units || 0);
    const freeQty = Number(batchForm.free_qty || 0);
    const qty = cases * pSize + extras + freeQty;

    if (qty === 0 && freeQty === 0) {
      alert("Please enter at least a quantity or free quantity.");
      return;
    }

    const itemData: BatchItem = {
      temp_id: editingItemId || Date.now(),
      product_id: activeProduct.id,
      product_name: activeProduct.name,
      material_code: activeProduct.material_code,
      barcode: activeProduct.barcode || "",
      no_cases: cases,
      pack_size: pSize,
      extra_units: extras,
      qty: qty,
      free_qty: Number(batchForm.free_qty || 0),
      retail_price: Number(batchForm.retail_price),
      netprice: Number(batchForm.net_price),
      expiry_date: batchForm.expiry_date,
    };

    if (editingItemId) {
      setBatchItems(
        batchItems.map((i) => (i.temp_id === editingItemId ? itemData : i)),
      );
    } else {
      setBatchItems([...batchItems, itemData]);
    }

    setActiveProduct(null);
    setEditingItemId(null);
    setBatchForm({
      no_cases: "",
      pack_size: "",
      extra_units: "0",
      free_qty: "0",
      retail_price: "",
      net_price: "",
      expiry_date: "",
    });
  };

  const handleEditItem = (item: BatchItem) => {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return;

    setActiveProduct(product);
    setEditingItemId(item.temp_id);
    setBatchForm({
      no_cases: item.no_cases.toString(),
      pack_size: item.pack_size.toString(),
      extra_units: (item.extra_units || 0).toString(),
      free_qty: (item.free_qty || 0).toString(),
      retail_price: item.retail_price.toString(),
      net_price: item.netprice.toString(),
      expiry_date: item.expiry_date || "",
    });
  };

  const handleRemoveItem = (id: number) => {
    setBatchItems(batchItems.filter((i) => i.temp_id !== id));
  };

  const handleCompleteSupply = async () => {
    setLoading(true);
    try {
      const payload = {
        supplier_id: Number(invoiceData.supplier_id),
        invoice_number: invoiceData.invoice_no,
        invoice_date: invoiceData.invoice_date,
        total_bill_amount: Number(originalInvoiceTotal),
        items: batchItems.map((item) => ({
          product_id: item.product_id,
          no_cases: item.no_cases,
          pack_size: item.pack_size,
          extra_units: item.extra_units,
          qty: item.qty,
          free_qty: item.free_qty,
          retail_price: item.retail_price,
          netprice: item.netprice,
          expiry_date: item.expiry_date || null,
        })),
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/supplies`,
        payload,
      );

      await refreshTotalValue();
      alert("Supply record successfully saved!");
      resetForm();
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Supply save error:", err);
      alert(err.response?.data?.message || "Failed to save supply record.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("invoice");
    setInvoiceData({
      supplier_id: "",
      supplier_name: "",
      invoice_no: "",
      invoice_date: new Date().toISOString().split("T")[0],
      total_bill_amount: "",
    });
    setBatchItems([]);
    setEditingItemId(null);
    setActiveProduct(null);
    setShowConfirmCancel(false);
    setOriginalInvoiceTotal(0);
  };

  const getItemsTotal = () => {
    return batchItems.reduce(
      (sum, item) => sum + (item.qty - (item.free_qty || 0)) * item.netprice,
      0,
    );
  };

  const [newProduct, setNewProduct] = useState({
    name: "",
    material_code: "",
    barcode: "",
    supplier_id: 0,
  });

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/products`,
        newProduct,
      );
      setProducts([...products, res.data]);
      setShowAddProductModal(false);
      handleSelectProduct(res.data);
      setNewProduct({
        name: "",
        material_code: "",
        barcode: "",
        supplier_id: 0,
      });
    } catch (err) {
      console.error("Error creating product:", err);
      alert("Failed to create product.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-6 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              New Supply Entry
            </h1>
            <p className="text-sm text-gray-500">
              Record and automate incoming inventory stock
            </p>
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
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-gray-700 uppercase tracking-wider text-xs">
                Invoice Preliminary Details
              </h2>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleProceedToItems}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                    Supplier Name
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={invoiceData.supplier_id}
                    required
                    onChange={(e) => {
                      const selected = suppliers.find(
                        (s) => s.id.toString() === e.target.value,
                      );
                      setInvoiceData({
                        ...invoiceData,
                        supplier_id: e.target.value,
                        supplier_name: selected ? selected.name : "",
                      });
                    }}
                  >
                    <option value="">Select a Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.invoice_no}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          invoice_no: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={invoiceData.invoice_date}
                      onChange={(e) =>
                        setInvoiceData({
                          ...invoiceData,
                          invoice_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                    Total Bill Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    value={invoiceData.total_bill_amount}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        total_bill_amount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Proceed to Item Entry"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 items-center">
              <div className="flex flex-wrap gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                      Supplier
                    </p>
                    <p className="font-bold text-gray-800 text-sm">
                      {invoiceData.supplier_name}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Invoice ID
                  </p>
                  <p className="font-bold text-blue-700 text-sm">
                    #{invoiceData.invoice_no}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-6 border-l pl-8 border-gray-100 py-1">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                    Original Invoice Total
                  </p>
                  <p className="text-base font-bold text-gray-900 border-b-2 border-transparent">
                    Rs.{" "}
                    {Number(originalInvoiceTotal).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-1">
                    Stocked Items Total
                  </p>
                  <p
                    className={`text-xl font-black ${Math.abs(getItemsTotal() - originalInvoiceTotal) < 0.01 ? "text-emerald-700" : getItemsTotal() > originalInvoiceTotal ? "text-red-600" : "text-blue-800"}`}
                  >
                    Rs.{" "}
                    {getItemsTotal().toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {Math.abs(getItemsTotal() - originalInvoiceTotal) < 0.01 ? (
                    <p className="text-[8px] font-bold text-emerald-600 uppercase">
                      ✓ Matches Invoice
                    </p>
                  ) : getItemsTotal() > originalInvoiceTotal ? (
                    <p className="text-[8px] font-bold text-red-600 uppercase animate-pulse">
                      ⚠ Not Correct: Exceeds Invoice Total!
                    </p>
                  ) : (
                    getItemsTotal() > 0 && (
                      <p className="text-[8px] font-bold text-red-500 uppercase">
                        ⚠ Remaining: Rs.{" "}
                        {(originalInvoiceTotal - getItemsTotal()).toFixed(2)}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white outline-none font-medium text-sm"
                placeholder="Scan Barcode / Search Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((p, index) => (
                    <div
                      key={p.id}
                      id={`search-result-${index}`}
                      onClick={() => handleSelectProduct(p)}
                      className={`px-4 py-2 cursor-pointer border-b text-xs flex items-center gap-4 font-bold transition-colors ${
                        highlightedIndex === index
                          ? "bg-blue-600 text-white"
                          : "hover:bg-blue-50 text-gray-700"
                      }`}
                    >
                      <span
                        className={`${highlightedIndex === index ? "text-blue-100" : "text-gray-400"} font-mono w-24 flex-shrink-0`}
                      >
                        {p.barcode || p.material_code}
                      </span>
                      <span className="flex-grow">{p.name}</span>
                      <span
                        className={`${highlightedIndex === index ? "text-white" : "text-blue-500"} font-medium`}
                      >
                        {p.supplier?.name || "No Supplier"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b">
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-4 py-4 text-center">Batch Vol.</th>
                    <th className="px-4 py-4 text-center">Units</th>
                    <th className="px-4 py-4 text-center">Free Qty</th>
                    <th className="px-4 py-4 text-right">Net Price</th>
                    <th className="px-4 py-4 text-right">Retail Price</th>
                    <th className="px-6 py-4 text-right">Line Total</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batchItems.map((item) => (
                    <tr
                      key={item.temp_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">
                          {item.product_name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.barcode || item.material_code}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-500 font-mono text-[11px]">
                        {item.no_cases} × {item.pack_size}
                        {item.extra_units > 0 && (
                          <span className="text-blue-500 font-bold ml-1">
                            + {item.extra_units}
                          </span>
                        )}
                        {(item.free_qty || 0) > 0 && (
                          <span className="text-emerald-500 font-bold ml-1">
                            + {item.free_qty}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center font-bold">
                        {item.qty}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-green-600">
                        {item.free_qty > 0 ? item.free_qty : "-"}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-blue-600">
                        Rs. {Number(item.netprice).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-orange-600">
                        Rs. {Number(item.retail_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        Rs.{" "}
                        {(
                          (item.qty - (item.free_qty || 0)) *
                          item.netprice
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-blue-400 hover:text-blue-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.temp_id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {batchItems.length === 0 && (
                <p className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest opacity-30">
                  Scan an item to begin
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {activeProduct && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4 text-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  Stocking Details
                </p>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">
                  {activeProduct.name}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  BARCODE:{" "}
                  {activeProduct.barcode || activeProduct.material_code}
                </p>
              </div>
              <button
                onClick={() => setActiveProduct(null)}
                className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            <form onSubmit={handleAddBatch} className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">
                    No. of Cases
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={batchForm.no_cases}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, no_cases: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">
                    Units per Pack
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={batchForm.pack_size}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, pack_size: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-blue-600 ml-0.5">
                    Extra Units (Loose)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 outline-none font-bold text-base text-blue-700"
                    value={batchForm.extra_units}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        extra_units: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-green-600 ml-0.5">
                  Free Qty{" "}
                  <span className="text-green-400 font-normal text-xs">
                    (Gift/Commission — not billed)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl bg-green-50 border border-green-100 outline-none font-bold text-base text-green-700"
                  value={batchForm.free_qty}
                  onKeyDown={handleBatchFormKeyDown}
                  onChange={(e) =>
                    setBatchForm({
                      ...batchForm,
                      free_qty: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">
                    Net Unit Cost (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={batchForm.net_price}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, net_price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-600 ml-0.5">
                    Retail Price (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                    value={batchForm.retail_price}
                    onKeyDown={handleBatchFormKeyDown}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        retail_price: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-600 ml-0.5">
                  Expiry Date{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none font-bold text-base"
                  value={batchForm.expiry_date}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, expiry_date: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProduct(null);
                    setEditingItemId(null);
                  }}
                  className="flex-1 py-3.5 font-bold text-gray-500 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading
                    ? editingItemId
                      ? "Updating..."
                      : "Adding..."
                    : editingItemId
                      ? "Update Item"
                      : "Add to Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmSave && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Finalize Entry?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              All items have been saved. Clicking Confirm will finish this
              session.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmSave(false)}
                className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCompleteSupply}
                className="py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-100"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCancel && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans text-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Discard Session?
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Any unsaved changes for invoice <b>{invoiceData.invoice_no}</b>{" "}
              will be lost.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="py-3 font-bold text-gray-500 border rounded-xl hover:bg-gray-50 text-xs"
              >
                Keep Entry
              </button>
              <button
                onClick={resetForm}
                className="py-3 font-bold text-white bg-red-500 rounded-xl shadow-lg shadow-red-100"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">
                Product Not Found
              </h3>
              <p className="text-gray-500 text-xs mt-1">
                Shall we register it now?
              </p>
            </div>

            <form onSubmit={handleAddNewProduct} className="space-y-4">
              <div>
                <label className="font-bold text-gray-600 block mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none font-bold"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">
                  Material Code
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none font-mono font-bold"
                  value={newProduct.material_code}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      material_code: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">
                  Supplier
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none font-bold appearance-none"
                  value={newProduct.supplier_id}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      supplier_id: Number(e.target.value),
                    })
                  }
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 py-3 font-bold text-gray-400 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSupply;
