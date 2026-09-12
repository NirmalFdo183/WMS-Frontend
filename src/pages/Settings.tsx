import { useState, useEffect, useRef } from "react";
import {
  User as UserIcon,
  Bell,
  Shield,
  Palette,
  Check,
  Info,
  ShieldAlert,
  Lock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type TabId = "account" | "notifications" | "security" | "appearance";
type DensityMode = "comfortable" | "compact";

interface TabItem {
  id: TabId;
  label: string;
  icon: typeof UserIcon;
}

const NAV_ITEMS: TabItem[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [storageError, setStorageError] = useState<string | null>(null);

  const tabListRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    account: null,
    notifications: null,
    security: null,
    appearance: null,
  });

  // User-scoped storage key
  const storageKey = user?.id
    ? `thejani_settings_${user.id}`
    : "thejani_settings_guest";

  // Load user preferences
  useEffect(() => {
    try {
      setStorageError(null);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.density === "compact" || parsed?.density === "comfortable") {
          setDensity(parsed.density);
          document.documentElement.setAttribute("data-density", parsed.density);
          return;
        }
      }
      // Default to comfortable
      setDensity("comfortable");
      document.documentElement.setAttribute("data-density", "comfortable");
    } catch (err: any) {
      console.warn("Unable to load preferences from storage:", err);
      setStorageError("Notice: Browser storage is restricted or unavailable.");
      document.documentElement.setAttribute("data-density", "comfortable");
    }
  }, [storageKey]);

  // Handle density change
  const handleDensityChange = (newMode: DensityMode) => {
    setDensity(newMode);
    document.documentElement.setAttribute("data-density", newMode);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ density: newMode }));
      setStorageError(null);
    } catch (err: any) {
      console.error("Failed to save settings to localStorage:", err);
      setStorageError(
        "Could not save preference to device storage. Spacing will reset upon reload."
      );
    }
  };

  // Keyboard navigation according to W3C Tabs Pattern
  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const totalTabs = NAV_ITEMS.length;
    let nextIndex = -1;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        nextIndex = (index + 1) % totalTabs;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = (index - 1 + totalTabs) % totalTabs;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = totalTabs - 1;
        break;
      default:
        return;
    }

    if (nextIndex >= 0) {
      const nextTab = NAV_ITEMS[nextIndex];
      setActiveTab(nextTab.id);
      tabButtonRefs.current[nextTab.id]?.focus();
    }
  };

  // Human-readable role label
  const roleDisplay = (() => {
    switch (user?.role) {
      case "admin":
        return {
          title: "Administrator",
          badge: "bg-teal-50 text-teal-800 border-teal-200",
          desc: "Full operational and administrative authority",
        };
      case "staff":
        return {
          title: "Warehouse Staff",
          badge: "bg-blue-50 text-blue-800 border-blue-200",
          desc: "Inventory receiving, picking, and dispatch management",
        };
      case "rep":
        return {
          title: "Sales Representative",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          desc: "Customer distribution and field sales tracking",
        };
      case "cashier":
        return {
          title: "Cashier",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
          desc: "POS register processing and receipt issuing",
        };
      default:
        return {
          title: "Standard User",
          badge: "bg-stone-100 text-stone-700 border-stone-200",
          desc: "Read-only access permissions",
        };
    }
  })();

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="min-h-full bg-[#f8f9fa] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Compact Page Heading */}
        <header className="border-b border-stone-200 pb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Manage your account and preferences.
          </p>
        </header>

        {/* Global Storage Error Message if storage fails */}
        {storageError && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800"
          >
            <Info size={16} className="text-amber-600 shrink-0" />
            <span>{storageError}</span>
          </div>
        )}

        {/* Settings Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Section Navigation (Tabs) */}
          <nav
            ref={tabListRef}
            role="tablist"
            aria-label="Settings sections"
            aria-orientation="vertical"
            className="w-full lg:w-60 shrink-0 bg-white border border-stone-200 rounded-lg p-1.5 shadow-xs flex lg:flex-col gap-1 overflow-x-auto no-scrollbar"
          >
            {NAV_ITEMS.map((item, index) => {
              const isSelected = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabButtonRefs.current[item.id] = el;
                  }}
                  id={`tab-${item.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`panel-${item.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(item.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all text-left whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-700/40 ${
                    isSelected
                      ? "bg-teal-50 text-teal-900 border-l-2 lg:border-l-4 border-teal-700 font-semibold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-stone-50"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 ${
                      isSelected ? "text-teal-800" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Section Content Area */}
          <main className="flex-1 w-full bg-white border border-stone-200 rounded-lg shadow-xs overflow-hidden">
            {/* Account Panel */}
            {activeTab === "account" && (
              <div
                id="panel-account"
                role="tabpanel"
                aria-labelledby="tab-account"
                tabIndex={0}
                className="p-6 sm:p-8 space-y-8 focus:outline-none"
              >
                <div className="border-b border-stone-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Profile information
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Your account profile and access credentials.
                  </p>
                </div>

                {/* Avatar Display */}
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-lg bg-teal-800 text-white flex items-center justify-center text-2xl font-bold shadow-xs select-none">
                    {userInitial}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Profile avatar
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Avatar is generated from your authenticated account name.
                    </p>
                  </div>
                </div>

                {/* Real User Static Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Full name
                    </label>
                    <div className="h-11 px-3.5 bg-stone-50 border border-stone-200 rounded-md flex items-center text-sm font-medium text-slate-900">
                      {user?.name || "Not specified"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email address
                    </label>
                    <div className="h-11 px-3.5 bg-stone-50 border border-stone-200 rounded-md flex items-center text-sm font-medium text-slate-900">
                      {user?.email || "No email assigned"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Username / Login handle
                    </label>
                    <div className="h-11 px-3.5 bg-stone-50 border border-stone-200 rounded-md flex items-center text-sm font-medium text-slate-900 font-mono">
                      {(user as any)?.username || "user"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      System role
                    </label>
                    <div className="h-11 px-3.5 bg-stone-50 border border-stone-200 rounded-md flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">
                        {roleDisplay.title}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${roleDisplay.badge}`}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Administrator Contact Notice */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg flex items-start gap-3 max-w-2xl">
                  <Info size={18} className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">
                      Need to update your profile details or permissions?
                    </span>
                    <p className="mt-0.5">
                      Account profiles, phone numbers, and operational roles are
                      managed centrally. Contact your system administrator to
                      update account details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Panel */}
            {activeTab === "notifications" && (
              <div
                id="panel-notifications"
                role="tabpanel"
                aria-labelledby="tab-notifications"
                tabIndex={0}
                className="p-6 sm:p-8 space-y-6 focus:outline-none"
              >
                <div className="border-b border-stone-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Notification preferences
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Alert delivery settings for your warehouse operations.
                  </p>
                </div>

                {/* Informative Banner */}
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg flex items-start gap-3">
                  <Info size={18} className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">
                      Automated alert dispatch is handled at the system level.
                    </span>
                    <p className="mt-0.5">
                      Personalized channel subscriptions (SMS/Email) are not
                      provisioned in this deployment. System notifications are
                      delivered directly through active dispatch manifests and
                      inventory alerts.
                    </p>
                  </div>
                </div>

                {/* 4 Notification Rows */}
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-200 overflow-hidden bg-white">
                  {[
                    {
                      id: "supply",
                      title: "New supply alerts",
                      desc: "When a new supply invoice or stock shipment is created.",
                    },
                    {
                      id: "stock",
                      title: "Low stock warnings",
                      desc: "Alerts when warehouse stock falls below minimum safety thresholds.",
                    },
                    {
                      id: "delivery",
                      title: "Delivery confirmations",
                      desc: "Updates on truck manifest completion and retail delivery status.",
                    },
                    {
                      id: "system",
                      title: "System updates",
                      desc: "Operational notices regarding system updates and maintenance windows.",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-medium text-slate-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 hidden sm:inline">
                          System default
                        </span>
                        {/* Disabled Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked="false"
                          disabled
                          title="Notification toggles are managed system-wide"
                          className="w-10 h-6 bg-stone-200 rounded-full relative cursor-not-allowed transition-colors focus:outline-none opacity-80"
                        >
                          <span className="block w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-xs transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Panel */}
            {activeTab === "security" && (
              <div
                id="panel-security"
                role="tabpanel"
                aria-labelledby="tab-security"
                tabIndex={0}
                className="p-6 sm:p-8 space-y-6 focus:outline-none"
              >
                <div className="border-b border-stone-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Password and security
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Security policies and credential management.
                  </p>
                </div>

                <div className="space-y-5 max-w-2xl">
                  {/* Centrally Managed Password Section */}
                  <div className="p-5 bg-white border border-stone-200 rounded-lg shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-slate-600">
                          <Lock size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Authentication credentials
                          </h3>
                          <p className="text-xs text-slate-500">
                            Password and account security
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-100 text-slate-700 border border-stone-200">
                        Centrally Managed
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-xs text-slate-600 leading-relaxed">
                      <p>
                        Password changes and authentication credentials are
                        managed centrally. Contact your system administrator to
                        reset or update your password.
                      </p>
                    </div>
                  </div>

                  {/* Two-Factor Authentication Section */}
                  <div className="p-5 bg-white border border-stone-200 rounded-lg shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-slate-600">
                          <ShieldAlert size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Two-factor authentication (2FA)
                          </h3>
                          <p className="text-xs text-slate-500">
                            Secondary authentication verification
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-100 text-slate-700 border border-stone-200">
                        Not configured on server
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-xs text-slate-600 leading-relaxed">
                      <p>
                        Two-factor authentication is not provisioned for this
                        instance. Access is governed by role-based session
                        tokens.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Panel */}
            {activeTab === "appearance" && (
              <div
                id="panel-appearance"
                role="tabpanel"
                aria-labelledby="tab-appearance"
                tabIndex={0}
                className="p-6 sm:p-8 space-y-8 focus:outline-none"
              >
                <div className="border-b border-stone-200 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Display preferences
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Customize interface density and visual appearance.
                  </p>
                </div>

                {/* Visual Theme Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Visual theme
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                    {/* Modern Light - Active */}
                    <div className="p-4 rounded-lg border-2 border-teal-700 bg-teal-50/20 flex flex-col justify-between h-32 relative shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center text-teal-800 shadow-2xs">
                          <Palette size={16} />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-300">
                          <Check size={12} /> Active
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Modern Light
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Standard light theme
                        </div>
                      </div>
                    </div>

                    {/* Premium Dark - Unavailable */}
                    <div className="p-4 rounded-lg border border-stone-200 bg-stone-50 flex flex-col justify-between h-32 opacity-60 cursor-not-allowed">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-md bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-500">
                          <Palette size={16} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 bg-stone-200/70 px-1.5 py-0.5 rounded">
                          Unavailable
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">
                          Premium Dark
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Unavailable in current release
                        </div>
                      </div>
                    </div>

                    {/* System Default - Unavailable */}
                    <div className="p-4 rounded-lg border border-stone-200 bg-stone-50 flex flex-col justify-between h-32 opacity-60 cursor-not-allowed">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-md bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-500">
                          <Sparkles size={16} />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 bg-stone-200/70 px-1.5 py-0.5 rounded">
                          Unavailable
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">
                          System Default
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Unavailable in current release
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Density Section */}
                <div className="pt-6 border-t border-stone-200 space-y-3 max-w-2xl">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Data density
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust spacing in tables and lists.
                    </p>
                  </div>

                  <div
                    role="radiogroup"
                    aria-label="Table and list density"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
                  >
                    {[
                      {
                        id: "comfortable",
                        label: "Comfortable",
                        desc: "Standard row height and balanced padding (Default)",
                      },
                      {
                        id: "compact",
                        label: "Compact",
                        desc: "Condenses table row heights for dense data viewing",
                      },
                    ].map((mode) => {
                      const isSelected = density === mode.id;

                      return (
                        <label
                          key={mode.id}
                          className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-teal-700 bg-teal-50/20 shadow-2xs"
                              : "border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="data-density"
                            value={mode.id}
                            checked={isSelected}
                            onChange={() =>
                              handleDensityChange(mode.id as DensityMode)
                            }
                            className="mt-0.5 h-4 w-4 text-teal-800 focus:ring-teal-700/40 border-stone-300 accent-teal-800"
                          />
                          <div className="space-y-0.5 select-none">
                            <span
                              className={`text-sm font-bold block ${
                                isSelected ? "text-teal-900" : "text-slate-900"
                              }`}
                            >
                              {mode.label}
                            </span>
                            <span className="text-xs text-slate-500 block leading-normal">
                              {mode.desc}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    Preference is saved per-user and immediately applies to all
                    inventory, sales, and supplier tables.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
