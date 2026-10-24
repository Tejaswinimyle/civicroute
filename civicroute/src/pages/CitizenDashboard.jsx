import { API_BASE_URL } from "../apiConfig";
import {
  ArrowRight,
  Bell,
  Bot,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  Lightbulb,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const getStatusClass = (status) => {
  switch ((status || "").toLowerCase()) {
    case "under review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "C";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const civicIssues = [
  {
    title: "Water Supply",
    description: "Report water interruptions or leaks",
    icon: Waves,
  },
  {
    title: "Roads",
    description: "Report potholes or damaged roads",
    icon: MapPin,
  },
  {
    title: "Sanitation",
    description: "Report waste or cleanliness issues",
    icon: ShieldCheck,
  },
  {
    title: "Streetlights",
    description: "Report damaged or inactive lights",
    icon: Zap,
  },
];

function CitizenDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [citizen, setCitizen] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadCitizenData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("civicroute_citizen_token");
        let profile = null;

        if (token) {
          try {
            const meRes = await fetch(`${API_BASE_URL}/auth/citizen/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              profile = await meRes.json();
              setCitizen(profile);
              localStorage.setItem("civicroute_logged_in_citizen", JSON.stringify(profile));
            }
          } catch (e) {
            console.warn("Could not fetch citizen profile from backend:", e);
          }
        }

        if (!profile) {
          const cached = JSON.parse(
            localStorage.getItem("civicroute_logged_in_citizen") || "null"
          );
          setCitizen(cached || { name: "Citizen", email: "" });
        }

        // Fetch citizen's complaints
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const compRes = await fetch(`${API_BASE_URL}/complaints`, { headers });
        if (compRes.ok) {
          const compData = await compRes.json();
          setComplaints(compData);
        }
      } catch (err) {
        console.error("Error loading citizen dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCitizenData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("civicroute_citizen_token");
    localStorage.removeItem("civicroute_logged_in_citizen");
    navigate("/citizen/login");
  };

  const totalCount = complaints.length;
  const underReviewCount = complaints.filter((c) => c.status === "Under Review").length;
  const inProgressCount = complaints.filter((c) => c.status === "In Progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;

  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return complaints;
    const q = searchQuery.toLowerCase().trim();
    return complaints.filter(
      (c) =>
        (c.id || c.complaint_id || "").toLowerCase().includes(q) ||
        (c.issue || "").toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q)
    );
  }, [complaints, searchQuery]);

  return (
    <div className="min-h-screen bg-[#eef4fb] text-slate-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[205px] flex-col bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Sparkles size={18} />
            </div>

            <span className="text-lg font-semibold tracking-tight">
              CivicRoute
            </span>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-3 pt-5">
          <p className="px-3 pb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Citizen Portal
          </p>

          <nav className="space-y-1">
            {/* Home */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white"
            >
              <Home size={17} />
              Home
            </button>

            {/* File Complaint */}
            <button
              onClick={() => navigate("/report")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <MessageSquare size={17} />
              File a Complaint
            </button>

            {/* My Complaints */}
            <button
              onClick={() => navigate("/complaints")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <FileText size={17} />
              My Complaints
            </button>

            {/* Track Status */}
            <button
              onClick={() => navigate("/complaints")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <MapPin size={17} />
              Track Status
            </button>

            {/* Help */}
            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate("/citizen/help");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <CircleHelp size={17} />
              Help & Support
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate("/citizen/settings");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <Settings size={17} />
              Settings
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="mt-auto border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative min-h-screen overflow-hidden lg:ml-[205px]">
        {/* Soft Background Decorations */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="absolute -bottom-40 left-20 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />

          <div className="absolute left-1/3 top-1/3 h-72 w-72 rounded-full bg-sky-100/30 blur-3xl" />
        </div>

        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-5 sm:px-7 lg:px-9">
            {/* Search */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="relative hidden w-[260px] sm:block lg:w-[330px]">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search complaints..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* User */}
            <div className="flex items-center gap-3">
              <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50">
                <Bell size={18} />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
              </button>

              <div className="hidden h-8 w-px bg-slate-200 sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 shadow-sm">
                  {getInitials(citizen?.name)}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    {citizen?.name || "Citizen"}
                  </p>

                  <p className="text-[11px] font-medium text-slate-500">
                    {citizen?.email || "Citizen Portal"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-7 lg:px-9">
          {/* Welcome */}
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-medium text-blue-600">
                Citizen Dashboard
              </p>

              <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
                {getGreeting()}, {citizen?.name ? citizen.name.split(" ")[0] : "Citizen"} 👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Welcome back. Manage your civic complaints and stay
                updated on issues in your community.
              </p>
            </div>

            <button
              onClick={() => navigate("/report")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <MessageSquare size={17} />
              File a Complaint
              <ArrowRight size={16} />
            </button>
          </section>

          {/* AI Assistant */}
          <section className="mt-7 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  <Bot size={21} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-black">
                      AI Civic Assistant
                    </h2>

                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700">
                      AI
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    Tell us what's wrong. We'll find the right
                    department.
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Describe your issue naturally — by typing or
                    speaking.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => navigate("/report")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <Sparkles size={15} />
                  Start Report
                </button>

                <button
                  onClick={() => navigate("/report")}
                  aria-label="Use voice assistant"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-600 transition hover:bg-blue-50"
                >
                  <Mic size={17} />
                </button>
              </div>
            </div>
          </section>

          {/* Statistics */}
          <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Total */}
            <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-black">
                Total Complaints
              </p>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-semibold text-black">
                  04
                </p>

                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <FileText size={17} />
                </div>
              </div>
            </div>

            {/* Under Review */}
            <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-black">
                Under Review
              </p>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-semibold text-black">
                  01
                </p>

                <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <MessageSquare size={17} />
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-black">
                In Progress
              </p>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-semibold text-black">
                  01
                </p>

                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Zap size={17} />
                </div>
              </div>
            </div>

            {/* Resolved */}
            <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-black">
                Resolved
              </p>

              <div className="mt-3 flex items-end justify-between">
                <p className="text-2xl font-semibold text-black">
                  02
                </p>

                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <ShieldCheck size={17} />
                </div>
              </div>
            </div>
          </section>

          {/* Recent Complaints */}
          <section className="mt-7 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-black">
                  Recent Complaints
                </h2>

                <p className="mt-1 text-xs font-medium text-black">
                  Track your latest civic reports and their
                  progress.
                </p>
              </div>

              <button
                onClick={() => navigate("/complaints")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="bg-blue-50/60 text-[10px] font-medium uppercase tracking-wide text-black">
                    <th className="px-5 py-3 text-left">
                      Complaint
                    </th>

                    <th className="px-3 py-3 text-left">
                      Issue
                    </th>

                    <th className="px-3 py-3 text-left">
                      Department
                    </th>

                    <th className="px-3 py-3 text-left">
                      Status
                    </th>

                    <th className="px-3 py-3 text-left">
                      Reported On
                    </th>

                    <th className="px-3 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                        Loading your civic complaints...
                      </td>
                    </tr>
                  ) : filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                          <FileText size={22} />
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {searchQuery ? "No complaints matched your search." : "No complaints reported yet."}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {searchQuery
                            ? "Try checking for typos or searching a different keyword."
                            : "Have you spotted a road hazard, broken streetlight, or sanitation issue? Submit a complaint to inform local authorities."}
                        </p>
                        {!searchQuery && (
                          <button
                            type="button"
                            onClick={() => navigate("/report")}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm"
                          >
                            <MessageSquare size={14} />
                            Report an Issue Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.slice(0, 6).map((complaint) => {
                      const displayId = complaint.complaint_id || complaint.id;
                      const statusClass = getStatusClass(complaint.status);
                      return (
                        <tr
                          key={displayId}
                          className="border-t border-slate-100 transition hover:bg-blue-50/50"
                        >
                          {/* Complaint ID */}
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold tracking-wide text-slate-800">
                              {displayId}
                            </span>
                          </td>

                          {/* Issue */}
                          <td className="px-3 py-4">
                            <span className="text-sm font-medium text-black">
                              {complaint.issue}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-3 py-4">
                            <span className="text-sm font-medium text-slate-800">
                              {complaint.department}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${statusClass}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {complaint.status}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-3 py-4">
                            <span className="text-xs font-medium text-black">
                              {complaint.date || complaint.created_at || "Recent"}
                            </span>
                          </td>

                          {/* Arrow */}
                          <td className="px-3 py-4 text-right">
                            <button
                              onClick={() => navigate(`/complaints/${displayId}`)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                              title="View Complaint Details"
                            >
                              <ChevronRight size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom Section */}
          <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            {/* Help */}
            <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-black">
                    Need Help?
                  </h2>

                  <p className="mt-1 text-xs font-medium text-black">
                    We are here to help you navigate the civic
                    reporting process.
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                  <CircleHelp size={18} />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={() => navigate("/citizen/help")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-black">
                    <MessageSquare
                      size={15}
                      className="text-blue-600"
                    />
                    How does CivicRoute work?
                  </span>

                  <ChevronRight
                    size={15}
                    className="text-slate-400"
                  />
                </button>

                <button
                  onClick={() => navigate("/citizen/help")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-black">
                    <FileText
                      size={15}
                      className="text-blue-600"
                    />
                    Understanding complaint status
                  </span>

                  <ChevronRight
                    size={15}
                    className="text-slate-400"
                  />
                </button>
              </div>
            </div>

            {/* Common Civic Issues */}
            <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-black">
                    Common Civic Issues
                  </h2>

                  <p className="mt-1 text-xs font-medium text-black">
                    Quickly report a problem in your community.
                  </p>
                </div>

                <Lightbulb
                  size={19}
                  className="text-slate-400"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {civicIssues.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.title}
                      onClick={() => navigate("/report")}
                      className="group rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-600">
                          <Icon size={17} />
                        </div>

                        <ArrowRight
                          size={14}
                          className="text-slate-300 transition group-hover:text-blue-600"
                        />
                      </div>

                      <p className="mt-3 text-sm font-medium text-black">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[11px] font-medium leading-4 text-black">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 CivicRoute. Making civic reporting simpler.
            </p>

            <div className="flex items-center gap-4">
              <span>Privacy</span>
              <span>Terms</span>

              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                System operational
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default CitizenDashboard;