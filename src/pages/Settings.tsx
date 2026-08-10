import { useState } from "react";
import { User, Bell, Shield, Palette } from "lucide-react";

const Settings = () => {
  const [activeTab, setActiveTab] = useState<
    "account" | "notifications" | "security" | "appearance"
  >("account");

  const navItems = [
    { id: "account", label: "Account", icon: <User size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "security", label: "Security", icon: <Shield size={18} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={18} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
          {activeTab === "account" && (
            <div className="space-y-10">
              <div className="border-b border-gray-100 pb-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Profile Information
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Update your personal details and how others see you.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-3xl shadow-inner">
                    <User size={40} className="text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <button className="px-5 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-all select-none active:scale-95 shadow-sm">
                      Change Photo
                    </button>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest pl-1">
                      JPG, GIF or PNG. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Nirmal"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Fernando"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="nirmal@example.com"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                      System Role
                    </label>
                    <input
                      type="text"
                      defaultValue="Administrator"
                      disabled
                      className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-gray-400 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-100 transition-all active:scale-95 text-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-10">
              <div className="border-b border-gray-100 pb-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Notification Center
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Choose what alerts you'd like to receive.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "New Supply Alerts",
                    desc: "When a new supply invoice is created.",
                  },
                  {
                    title: "Low Stock Warnings",
                    desc: "Alerts when items fall below minimum levels.",
                  },
                  {
                    title: "Delivery Confirmations",
                    desc: "Updates on manifest completion status.",
                  },
                  {
                    title: "System Updates",
                    desc: "Notifications about new feature releases.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between p-5 rounded-2xl border border-gray-50 hover:bg-gray-50/50 transition-all cursor-pointer group"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium">
                        {item.desc}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        defaultChecked
                      />
                      <div className="w-12 h-7 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-10">
              <div className="border-b border-gray-100 pb-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Security & Access
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Protect your account and hardware safety.
                </p>
              </div>

              <div className="space-y-10">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Update Credentials
                  </h3>
                  <div className="space-y-4 max-w-md">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                    />
                    <button className="px-8 py-3.5 bg-white border-2 border-blue-100 text-blue-600 rounded-xl text-sm font-black hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm">
                      Update Securely
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div>
                      <h3 className="font-black text-blue-900 leading-none">
                        Two-Factor Authentication
                      </h3>
                      <p className="text-xs text-blue-600/70 font-bold mt-1.5 tracking-tight">
                        Add an extra layer of security to your warehouse access.
                      </p>
                    </div>
                    <button className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-10">
              <div className="border-b border-gray-100 pb-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  Display Preferences
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Adjust visual styles for your visual comfort.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                    Visual Theme
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button className="p-6 border-2 border-blue-600 rounded-3xl bg-white text-center hover:bg-gray-50 ring-4 ring-blue-500/10 transition-all group">
                      <div className="h-12 w-12 bg-gray-100 rounded-2xl mx-auto mb-3 flex items-center justify-center text-blue-600">
                        <Palette size={24} />
                      </div>
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-blue-600">
                        Modern Light
                      </span>
                    </button>
                    <button
                      className="p-6 border border-gray-100 rounded-3xl bg-gray-50 text-center opacity-50 cursor-not-allowed group grayscale"
                      disabled
                    >
                      <div className="h-12 w-12 bg-gray-800 rounded-2xl mx-auto mb-3"></div>
                      <span className="text-sm font-bold text-gray-400">
                        Premium Dark (Soon)
                      </span>
                    </button>
                    <button
                      className="p-6 border border-gray-100 rounded-3xl bg-gray-50 text-center opacity-50 cursor-not-allowed grayscale"
                      disabled
                    >
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mx-auto mb-3"></div>
                      <span className="text-sm font-bold text-gray-400">
                        System Default
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                    Data Density
                  </h3>
                  <div className="flex gap-6">
                    {[
                      { id: "comfortable", label: "Comfortable" },
                      { id: "compact", label: "Compact" },
                    ].map((mode) => (
                      <label
                        key={mode.id}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="radio"
                            name="density"
                            defaultChecked={mode.id === "comfortable"}
                            className="peer appearance-none w-6 h-6 border-2 border-gray-200 rounded-full checked:border-blue-600 transition-all"
                          />
                          <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                        </div>
                        <span className="text-gray-900 font-bold group-hover:text-blue-600 transition-colors">
                          {mode.label}
                        </span>
                      </label>
                    ))}
                  </div>
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
