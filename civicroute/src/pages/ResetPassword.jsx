import { API_BASE_URL } from "../apiConfig";
import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      verifyToken(tokenParam);
    }
  }, [tokenParam]);

  const verifyToken = async (rawToken) => {
    if (!rawToken.trim()) return;
    setIsVerifying(true);
    setTokenError("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-reset-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Reset token is invalid or expired.");
      }

      setTokenInfo(data);
    } catch (err) {
      console.error("Token verify error:", err);
      setTokenError(err.message || "Invalid or expired password reset token.");
      setTokenInfo(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const rawToken = token.trim();
    if (!rawToken) {
      setSubmitError("Reset token is required.");
      return;
    }

    if (newPassword.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: rawToken,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed.");
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setSubmitError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-60 right-10 h-[550px] w-[550px] rounded-full bg-blue-100/60 blur-3xl" />

      {/* Navigation */}
      <nav className="relative z-20 px-6 py-6 md:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back to CivicRoute
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
              Choose New Password
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create a secure password for your CivicRoute account
            </p>
          </div>

          {isSuccess ? (
            <div className="mt-7 space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Password Reset Successfully!
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Your password has been updated. You can now sign in to CivicRoute with your new credentials.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      tokenInfo?.user_type === "authority"
                        ? "/authority/login"
                        : "/citizen/login"
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 cursor-pointer"
                >
                  Proceed to Sign In
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              {/* Token Input if not provided or to modify */}
              {!tokenParam && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      verifyToken(e.target.value);
                    }}
                    placeholder="Paste reset token here..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 px-4 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              )}

              {tokenInfo && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between">
                  <span className="font-semibold capitalize">
                    Account: {tokenInfo.identifier}
                  </span>
                  <span className="rounded-full bg-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase">
                    {tokenInfo.user_type}
                  </span>
                </div>
              )}

              {tokenError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-semibold">{tokenError}</p>
                    <Link
                      to="/forgot-password"
                      className="mt-1 inline-block font-semibold underline text-red-800 hover:text-red-900"
                    >
                      Request a new password reset token
                    </Link>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || Boolean(tokenError)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  "Updating Password..."
                ) : (
                  <>
                    Confirm & Update Password
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

