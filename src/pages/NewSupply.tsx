import { useState, useEffect } from "react";
import axios from "axios";

interface Product {
  id: number;
  name: string;
  material_code: string;
}

interface BatchItem {
  temp_id?: number; // for frontend list management
  product_id: number;
  product_name: string;
  no_cases: number;
  pack_size: number;
  qty: number;
  retail_price: number;
  netprice: number;
  expiry_date: string;
}

const NewSupply = () => {
  // Invoice State
  const [supplierId, setSupplierId] = useState("1");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Batch Item State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [noCases, setNoCases] = useState("");
  const [packSize, setPackSize] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [netPrice, setNetPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Lists
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Loading/Error
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Products
        const productsRes = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/products`,
        );
        setProducts(productsRes.data);
      } catch (err) {
        console.error("Error fetching resources:", err);
        // Mock data for fallback if API fails (Optional, but helpful for dev)

        // Products usually fetched by Product page, so we expect some there.
      }
    };
    fetchData();
  }, []);

  const handleAddBatchItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedProductId ||
      !noCases ||
      !packSize ||
      !retailPrice ||
      !netPrice
    ) {
      alert("Please fill in all required batch details");
      return;
    }

    const product = products.find((p) => p.id === Number(selectedProductId));
    if (!product) return;

    const cases = Number(noCases);
    const pSize = Number(packSize);
    const calculatedQty = cases * pSize;

    const newItem: BatchItem = {
      temp_id: Date.now(),
      product_id: product.id,
      product_name: product.name,
      no_cases: cases,
      pack_size: pSize,
      qty: calculatedQty,
      retail_price: Number(retailPrice),
      netprice: Number(netPrice),
      expiry_date: expiryDate,
    };

    setBatchItems([...batchItems, newItem]);

    // Reset item fields
    setSelectedProductId("");
    setNoCases("");
    setPackSize("");
    setRetailPrice("");
    setNetPrice("");
    setExpiryDate("");
  };

  const handleRemoveItem = (tempId: number) => {
    setBatchItems(batchItems.filter((item) => item.temp_id !== tempId));
  };

  const handleSubmitSupply = async () => {
    if (!supplierId || !invoiceNo) {
      alert("Please fill in Supplier and Invoice details");
      return;
    }
    if (batchItems.length === 0) {
      alert("Please add at least one batch item");
      return;
    }

    const payload = {
      supplier_id: Number(supplierId),
      invoice_number: invoiceNo,
      invoice_date: invoiceDate,
      items: batchItems,
    };

    try {
      setLoading(true);
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/supplies`,
        payload,
      );
      alert("Supply invoice created successfully!");
      // Reset Form
      setInvoiceNo("");
      setSupplierId("");
      setBatchItems([]);
    } catch (err) {
      console.error("Error creating supply:", err);
      alert("Failed to create supply invoice.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate Qty display
  const currentQty = (Number(noCases) || 0) * (Number(packSize) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">New Supply Entry</h1>
          <p className="text-gray-500 mt-1">
            Record incoming stock from supplier invoices
          </p>
        </div>
        <button
          onClick={handleSubmitSupply}
          disabled={loading}
          className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2 font-medium ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? "Processing..." : "Complete Supply Entry"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invoice & Add Item Forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invoice Details Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
              Invoice Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                Hemas Pharmaceuticals
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="INV-2024-001"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          {/* Add Batch Item Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Add Batch Item
            </h2>
            <form onSubmit={handleAddBatchItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Select Product to Add</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.material_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. of Cases
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={noCases}
                    onChange={(e) => setNoCases(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pack Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                  />
                </div>
              </div>

              {/* Calculated Qty Display */}
              <div className="bg-blue-50 px-4 py-2 rounded-lg flex justify-between items-center text-blue-800 text-sm">
                <span>Total Quantity:</span>
                <span className="font-bold text-lg">{currentQty} Units</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Net Price (Cost)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
                      Rs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={netPrice}
                      onChange={(e) => setNetPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retail Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">
                      Rs.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add to Invoice
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Invoice Items List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">Invoice Items</h3>
              <span className="text-sm text-gray-500">
                {batchItems.length} Items Added
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="bg-gray-50 text-gray-500 text-xs font-medium uppercase tracking-wider">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-center">Cases</th>
                    <th className="px-6 py-4 text-center">Pack</th>
                    <th className="px-6 py-4 text-center">Total Qty</th>
                    <th className="px-6 py-4 text-right">Net Price</th>
                    <th className="px-6 py-4 text-right">Retail Price</th>
                    <th className="px-6 py-4 text-right">Total Cost</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batchItems.map((item) => (
                    <tr
                      key={item.temp_id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">
                          {item.product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Exp: {item.expiry_date || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {item.no_cases}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {item.pack_size}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-blue-600">
                        {item.qty}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {item.netprice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {item.retail_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-800">
                        {(item.qty * item.netprice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.temp_id!)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {batchItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-gray-400 italic"
                      >
                        No items added to this invoice yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                {batchItems.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold text-gray-800 border-t border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-right">
                        Invoice Total:
                      </td>
                      <td className="px-6 py-4 text-right">
                        Rs.{" "}
                        {batchItems
                          .reduce(
                            (sum, item) => sum + item.qty * item.netprice,
                            0,
                          )
                          .toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSupply;
