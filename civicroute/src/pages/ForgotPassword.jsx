import { API_BASE_URL } from "../apiConfig";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  ExternalLink,
} from "lucide-react";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "authority" ? "authority" : "citizen";

  const [role, setRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "authority" || roleParam === "citizen") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError(
        role === "citizen"
          ? "Please enter your registered email address or phone number."
          : "Please enter your registered officer ID."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: cleanId,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to request password reset.");
      }

      setResult(data);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(
        err.message ||
          "Failed to connect to the authentication server. Please ensure the CivicRoute backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 text-slate-900">
      {/* Background soft shapes */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-60 right-10 h-[550px] w-[550px] rounded-full bg-blue-100/60 blur-3xl" />

      {/* Navigation */}
      <nav className="relative z-20 px-6 py-6 md:px-12">
        <Link
          to={role === "authority" ? "/authority/login" : "/citizen/login"}
          className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to {role === "authority" ? "Authority Login" : "Citizen Login"}
        </Link>
      </nav>

      {/* Main Container */}
      <main className="relative z-10 flex min-h-[calc(100vh-140px)] items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_20px_70px_rgba(59,130,246,0.12)] backdrop-blur-xl sm:p-9">
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
              <KeyRound size={30} strokeWidth={2} />
            </div>
          </div>

          <div className="mt-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Forgot Password?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Recover access to your verified CivicRoute account
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setRole("citizen");
                setError("");
                setResult(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                role === "citizen"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Citizen Account
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("authority");
                setError("");
                setResult(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                role === "authority"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Authority Officer
            </button>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {role === "citizen" ? "Email Address or Phone" : "Officer ID"}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === "citizen"
                        ? "e.g. citizen@example.com or phone"
                        : "e.g. water001, roads001, admin001"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  "Generating Reset Token..."
                ) : (
                  <>
                    Send Reset Instructions
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              {result.email_delivery?.sent ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Check Your Inbox</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    A password reset email has been dispatched to your address. Follow the link in the message within 1 hour to set your new password.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Info size={19} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Password Reset Token Generated
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {result.email_delivery?.message ||
                          "SMTP configuration is pending in this environment. In development mode, use the direct reset link below:"}
                      </p>
                    </div>
                  </div>

                  {result.dev_reset_token && (
                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Reset Token (expires in 1 hour)
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-800 break-all select-all font-semibold">
                        {result.dev_reset_token}
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <Link
                      to={`/reset-password?token=${result.dev_reset_token}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                      Reset Password Now
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setIdentifier("");
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Request another reset token
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <Link
              to={role === "authority" ? "/authority/login" : "/citizen/login"}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Remember your password? Sign in here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

