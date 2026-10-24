import { API_BASE_URL } from "../apiConfig";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
  ShieldCheck,
  Sparkles,
  FileText,
  CircleHelp,
  Calendar,
} from "lucide-react";

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "C";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function CitizenSettings() {
  const navigate = useNavigate();

  // Profile data
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states for profile editing
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // -------------------------------------------------------------
  // Load Citizen Profile
  // -------------------------------------------------------------
  useEffect(() => {
    const fetchCitizenProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("civicroute_citizen_token");

        if (!token) {
          // If no token, check cached local storage or redirect to login
          const cached = JSON.parse(
            localStorage.getItem("civicroute_logged_in_citizen") || "null"
          );
          if (cached) {
            setProfile(cached);
            setName(cached.name || "");
            setPhone(cached.phone || "");
            setLocation(cached.location || "");
          } else {
            navigate("/citizen/login");
            return;
          }
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/auth/citizen/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setName(data.name || "");
          setPhone(data.phone || "");
          setLocation(data.location || "");
          localStorage.setItem(
            "civicroute_logged_in_citizen",
            JSON.stringify(data)
          );
        } else if (res.status === 401) {
          navigate("/citizen/login");
        } else {
          // Fallback to cache if available
          const cached = JSON.parse(
            localStorage.getItem("civicroute_logged_in_citizen") || "null"
          );
          if (cached) {
            setProfile(cached);
            setName(cached.name || "");
            setPhone(cached.phone || "");
            setLocation(cached.location || "");
          }
        }
      } catch (err) {
        console.warn("Could not fetch citizen profile:", err);
        const cached = JSON.parse(
          localStorage.getItem("civicroute_logged_in_citizen") || "null"
        );
        if (cached) {
          setProfile(cached);
          setName(cached.name || "");
          setPhone(cached.phone || "");
          setLocation(cached.location || "");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCitizenProfile();
  }, [navigate]);

  // -------------------------------------------------------------
  // Handle Profile Update
  // -------------------------------------------------------------
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    if (!name.trim()) {
      setProfileError("Full name cannot be empty.");
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const token = localStorage.getItem("civicroute_citizen_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/auth/citizen/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          location: location.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile information.");
      }

      setProfile(data.citizen);
      localStorage.setItem(
        "civicroute_logged_in_citizen",
        JSON.stringify(data.citizen)
      );
      setProfileSuccess("Profile details updated successfully.");
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileError(
        err.message ||
          "Unable to save changes. Please ensure the backend is running."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Password Change
  // -------------------------------------------------------------
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem("civicroute_citizen_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(
        `${API_BASE_URL}/auth/citizen/change-password`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to change password.");
      }

      setPasswordSuccess(data.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError(
        err.message ||
          "Unable to change password. Please check your current password."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Logout
  // -------------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("civicroute_citizen_token");
    localStorage.removeItem("civicroute_logged_in_citizen");
    navigate("/citizen/login");
  };

  return (
    <div className="min-h-screen bg-[#eef4fb] text-slate-900">
      {/* Background soft decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-[500px] w-[500px] rounded-full bg-indigo-200/25 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/citizen/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <Sparkles size={16} />
              </div>
              <span className="hidden font-bold tracking-tight text-slate-900 sm:inline text-sm">
                CivicRoute
              </span>
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer"
              title="Sign out of your account"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <ShieldCheck size={16} />
            Citizen Account Settings
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Profile & Security
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-slate-600">
            Manage your personal contact information, update credentials, and review account security.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/80 bg-white/90 p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading your account profile...
            </p>
          </div>
        ) : (
          <div className="grid gap-7 lg:grid-cols-[340px_1fr]">
            {/* Left Column: Profile Summary Card */}
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
                    {getInitials(profile?.name)}
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-slate-900">
                    {profile?.name || "Citizen"}
                  </h2>
                  <p className="text-xs text-slate-500">{profile?.email || "No email"}</p>

                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                    <ShieldCheck size={14} className="text-blue-600" />
                    Verified Citizen Profile
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <Mail size={15} className="text-slate-400" />
                      Email
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {profile?.email || "Not specified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      Phone
                    </span>
                    <span className="font-semibold text-slate-800">
                      {profile?.phone || "Not specified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <MapPin size={15} className="text-slate-400" />
                      Location
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {profile?.location || "Not specified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <FileText size={15} className="text-slate-400" />
                      Total Complaints
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-800">
                      {profile?.total_complaints ?? 0}
                    </span>
                  </div>

                  {profile?.created_at && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-2">
                        <Calendar size={15} className="text-slate-400" />
                        Member Since
                      </span>
                      <span className="font-semibold text-slate-800">
                        {profile.created_at.split(" ")[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Navigation to Help */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <Link
                    to="/citizen/help"
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="flex items-center gap-2">
                      <CircleHelp size={16} className="text-blue-600" />
                      Help & Support Center
                    </span>
                    <span className="text-blue-600">→</span>
                  </Link>
                </div>
              </div>

              {/* Security Notice */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-relaxed text-indigo-900">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Privacy & Data Safeguards</p>
                    <p className="mt-1 text-[11px] text-indigo-800/80">
                      CivicRoute encrypts your credentials using bcrypt. Passwords and sensitive authentication tokens are never exposed or transmitted in plain text.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Edit Forms */}
            <div className="space-y-7">
              {/* EDIT PROFILE FORM */}
              <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Personal Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Update your name and primary contact details for civic complaint updates.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="mt-6 space-y-4">
                  {profileSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <User size={16} />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full legal name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Phone size={16} />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Email (Read only primary identifier) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Email Address <span className="text-[10px] font-normal text-slate-400">(Account Identifier)</span>
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          value={profile?.email || ""}
                          disabled
                          className="w-full rounded-xl border border-slate-200 bg-slate-100/80 py-2.5 pl-10 pr-3.5 text-sm text-slate-600 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Default Area / Ward
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <MapPin size={16} />
                        </div>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g. Ward 12, Indiranagar"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Save size={15} />
                      {isUpdatingProfile ? "Saving Changes..." : "Save Profile Changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* CHANGE PASSWORD FORM */}
              <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Security & Password
                    </h2>
                    <p className="text-xs text-slate-500">
                      Update your account password regularly to keep your citizen identity protected.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                  {passwordSuccess && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        New Password (min. 6 chars)
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Lock size={15} />
                      {isChangingPassword ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>

              {/* ACCOUNT LOGOUT CARD */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Sign Out of Citizen Session
                  </h3>
                  <p className="text-xs text-slate-500">
                    Safely log out of your current device session.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 cursor-pointer"
                >
                  <LogOut size={15} />
                  Logout Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

