import { useState } from "react";

interface ManifestItem {
  id: number;
  productName: string;
  materialCode: string;
  quantity: number;
  weight: number; // in kg
}

const Loading = () => {
  // Trip Details State
  const [truckNo, setTruckNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [destination, setDestination] = useState("");

  // Item Entry State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(0);

  // Manifest Data
  const [manifestItems, setManifestItems] = useState<ManifestItem[]>([
    {
      id: 1,
      productName: "Paracetamol 500mg",
      materialCode: "MED-001",
      quantity: 5000,
      weight: 25,
    },
    {
      id: 2,
      productName: "Surgical Masks",
      materialCode: "MED-005",
      quantity: 1000,
      weight: 12,
    },
  ]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) return;

    const newItem: ManifestItem = {
      id: Date.now(),
      productName: selectedProduct, // In real app, would lookup name from ID
      materialCode: "TEMP-CODE",
      quantity: quantity,
      weight: quantity * 0.5, // Mock weight calc
    };

    setManifestItems([...manifestItems, newItem]);
    setSelectedProduct("");
    setQuantity(0);
  };

  const handleRemoveItem = (id: number) => {
    setManifestItems(manifestItems.filter((item) => item.id !== id));
  };

  const totalWeight = manifestItems.reduce((sum, item) => sum + item.weight, 0);
  const totalItems = manifestItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Truck Loading Manifest
          </h1>
          <p className="text-gray-500 mt-1">
            Create and manage shipment manifests
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <span>🖨️</span> Print
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2">
            <span>✓</span> Complete Loading
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trip Information Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
            Trip Details
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Truck Registration
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex. WP-CA-1234"
                value={truckNo}
                onChange={(e) => setTruckNo(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex. John Doe"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route / Destination
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Select Route</option>
                <option value="colombo-north">Colombo North</option>
                <option value="kandy-main">Kandy Main Line</option>
                <option value="galle-coastal">Galle Coastal</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Total Items:</span>
              <span className="font-semibold">{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Weight:</span>
              <span className="font-semibold">{totalWeight} kg</span>
            </div>
          </div>
        </div>

        {/* Loading Content Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Item Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Add Items to Manifest
            </h2>
            <form
              onSubmit={handleAddItem}
              className="flex flex-col sm:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <input
                  type="text"
                  placeholder="Search product code or name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Manifest Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-sm font-medium">
                    <th className="px-6 py-4">Item Details</th>
                    <th className="px-6 py-4">Material Code</th>
                    <th className="px-6 py-4 text-center">Quantity</th>
                    <th className="px-6 py-4 text-center">Weight (kg)</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {manifestItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                        {item.materialCode}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {item.weight}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove from manifest"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {manifestItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-gray-400 italic"
                      >
                        No items added to the manifest yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
