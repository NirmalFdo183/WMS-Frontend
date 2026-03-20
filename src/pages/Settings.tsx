import { useState } from "react";

const Settings = () => {
  const [activeTab, setActiveTab] = useState<
    "account" | "notifications" | "security" | "appearance"
  >("account");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <p className="text-gray-500 mb-8">
        Manage your account settings and preferences
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 overflow-x-auto md:overflow-visible">
          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab("account")}
              className={`flex-shrink-0 md:w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "account"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-3">👤</span> Account
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex-shrink-0 md:w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "notifications"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-3">🔔</span> Notifications
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-shrink-0 md:w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "security"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-3">🔒</span> Security
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex-shrink-0 md:w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "appearance"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="mr-3">🎨</span> Appearance
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {activeTab === "account" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-4">
                Profile Information
              </h2>
              <div className="grid gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
                    👤
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Change Photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Nirmal"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Fernando"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="nirmal@example.com"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      defaultValue="Administrator"
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-4">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  "New Supply Alerts",
                  "Low Stock Warnings",
                  "Delivery Confirmations",
                  "System Updates",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <h3 className="font-medium text-gray-800">{item}</h3>
                      <p className="text-sm text-gray-500">
                        Receive notifications about {item.toLowerCase()}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-4">
                Security Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-4">
                    Change Password
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="font-medium text-gray-800 mb-2">
                    Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-4">
                Appearance Settings
              </h2>
              <div>
                <h3 className="font-medium text-gray-800 mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <button className="p-4 border-2 border-blue-500 rounded-xl bg-white text-center hover:bg-gray-50">
                    <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    className="p-4 border border-gray-200 rounded-xl bg-gray-900 text-white text-center hover:bg-gray-800 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="h-8 w-8 bg-gray-700 rounded-full mx-auto mb-2"></div>
                    <span className="text-sm font-medium">Dark (Soon)</span>
                  </button>
                  <button
                    className="p-4 border border-gray-200 rounded-xl bg-gray-100 text-center hover:bg-gray-200 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="h-8 w-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-2"></div>
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-medium text-gray-800 mb-4">Density</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="density"
                      defaultChecked
                      className="text-blue-600"
                    />
                    <span className="text-gray-700">Comfortable</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="density"
                      className="text-blue-600"
                    />
                    <span className="text-gray-700">Compact</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
