import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

interface FieldErrors {
  username?: string;
  password?: string;
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Detect Caps Lock key state
  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Preserve exact characters - do not trim or modify
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against duplicate active submissions
    if (loading) return;

    setGeneralError("");

    // Validate fields according to W3C notification guidance
    const errors: FieldErrors = {};
    if (!username.trim()) {
      errors.username = "Enter your username";
    }
    if (!password) {
      errors.password = "Enter your password";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Move focus to first invalid control
      if (errors.username) {
        usernameInputRef.current?.focus();
      } else if (errors.password) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Axios request with 12s timeout for connection responsiveness
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/login`,
        {
          username: username.trim(),
          password, // NEVER trim password
        },
        {
          timeout: 12000,
        },
      );

      const { access_token, user } = response.data;
      const loggedUser = user || { name: "User", email: "email@example.com" };
      login(access_token, loggedUser);

      if (loggedUser.role === "cashier") {
        navigate("/pos");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        // Request took too long
        setGeneralError("Sign-in is taking longer than expected. Please try again.");
      } else if (!err.response) {
        // Server unreachable or network error
        setGeneralError("Unable to connect. Please try again.");
      } else if (err.response.status === 401 || err.response.status === 422) {
        // Incorrect credentials
        setGeneralError("Username or password is incorrect.");
      } else if (err.response.status >= 500) {
        // Internal server error
        setGeneralError("Unable to connect. Please try again.");
      } else {
        // Generic failure
        setGeneralError("Username or password is incorrect.");
      }

      // Preserve entered username, focus password field for convenient retry
      passwordInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-xl border border-stone-200 shadow-sm p-6 sm:p-8">
        {/* Brand Area */}
        <div className="text-center mb-6">
          <img
            src="/logo-bg-removed.png"
            alt="Thejani Traders Logo"
            width={72}
            height={81}
            className="w-[72px] h-[81px] object-contain mx-auto"
            loading="eager"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-3">
            Thejani Traders
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Warehouse Management System
          </p>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium text-sm leading-snug">{generalError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Username Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              ref={usernameInputRef}
              value={username}
              onChange={handleUsernameChange}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="Enter your username"
              aria-required="true"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={
                fieldErrors.username ? "username-error" : undefined
              }
              className={`w-full h-11 px-3.5 text-base text-slate-900 bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.username
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-stone-300 focus:border-teal-700 focus:ring-teal-700/20"
              }`}
            />
            {fieldErrors.username && (
              <p
                id="username-error"
                role="alert"
                className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1"
              >
                <AlertCircle size={13} className="shrink-0" />
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                ref={passwordInputRef}
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyModifier}
                onKeyUp={handleKeyModifier}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  [
                    fieldErrors.password ? "password-error" : null,
                    capsLockOn ? "capslock-warning" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                className={`w-full h-11 pl-3.5 pr-11 text-base text-slate-900 bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-stone-300 focus:border-teal-700 focus:ring-teal-700/20"
                }`}
              />

              {/* Password Visibility Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-700/40"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Caps Lock Indicator */}
            {capsLockOn && (
              <p
                id="capslock-warning"
                role="status"
                aria-live="polite"
                className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md mt-1.5 font-medium flex items-center gap-1.5"
              >
                <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                Caps Lock is on
              </p>
            )}

            {/* Password Validation Error */}
            {fieldErrors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1"
              >
                <AlertCircle size={13} className="shrink-0" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        {/* Administrator Assistance */}
        <div className="mt-6 pt-5 border-t border-stone-100 text-center">
          <p className="text-sm text-slate-500">
            Need access?{" "}
            <span className="text-slate-700 font-medium">
              Contact your administrator.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
