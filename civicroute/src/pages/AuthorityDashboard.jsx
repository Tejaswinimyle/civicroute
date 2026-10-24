import { API_BASE_URL } from "../apiConfig";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lightbulb,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

const complaintLocations = {
  "WTR-10234": [17.455, 78.445],
  "RD-08421": [17.470, 78.425],
  "SAN-07156": [17.440, 78.465],
  "STL-06342": [17.485, 78.455],
};
// Get GPS coordinates from the backend.
// Use old demo coordinates only for older demo complaints.
const getComplaintCoordinates = (complaint) => {
  if (
    complaint.latitude !== null &&
    complaint.latitude !== undefined &&
    complaint.longitude !== null &&
    complaint.longitude !== undefined
  ) {
    const latitude = Number(complaint.latitude);
    const longitude = Number(complaint.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return [latitude, longitude];
    }
  }

  return complaintLocations[complaint.id] || null;
};

const demoComplaints = [
  {
    id: "WTR-10234",
    issue: "Water Supply",
    department: "Water & Sanitation",
    location: "Ward 12",
    priority: "High",
    status: "Under Review",
    description:
      "No water supply has been available in the area for the last three days.",
    letter:
      "Respected Sir/Madam,\n\nI am writing to bring to your attention the interruption of water supply in the reported area. Residents have been facing inconvenience due to the lack of regular water service.\n\nI kindly request the concerned department to inspect the issue and restore the water supply at the earliest.\n\nThank you.\n\nYours faithfully,\nCitizen / Resident",
    date: "04 Oct 2026",
  },
  {
    id: "RD-08421",
    issue: "Road Damage",
    department: "Roads & Infrastructure",
    location: "Ward 8",
    priority: "High",
    status: "In Progress",
    description:
      "Several large potholes have developed on the main road and are creating safety concerns.",
    letter:
      "Respected Sir/Madam,\n\nI am writing to bring to your attention the damaged condition of the road in the reported area. Several potholes are causing inconvenience and creating a potential safety risk.\n\nI kindly request the concerned department to inspect and repair the damaged road at the earliest.\n\nThank you.\n\nYours faithfully,\nCitizen / Resident",
    date: "02 Oct 2026",
  },
  {
    id: "SAN-07156",
    issue: "Garbage Collection",
    department: "Sanitation",
    location: "Ward 15",
    priority: "Medium",
    status: "Resolved",
    description:
      "Garbage has not been collected regularly from the residential area.",
    letter:
      "Respected Sir/Madam,\n\nI wish to bring to your attention the irregular collection of garbage in the reported area.\n\nI kindly request the concerned department to ensure regular waste collection and appropriate sanitation measures.\n\nThank you.\n\nYours faithfully,\nCitizen / Resident",
    date: "28 Sep 2026",
  },
  {
    id: "STL-06342",
    issue: "Streetlight",
    department: "Electricity & Lighting",
    location: "Ward 4",
    priority: "Medium",
    status: "Resolved",
    description:
      "A streetlight near the residential road has stopped functioning.",
    letter:
      "Respected Sir/Madam,\n\nI wish to bring to your attention that a streetlight in the reported area is not functioning.\n\nI kindly request the concerned department to inspect and repair the streetlight at the earliest.\n\nThank you.\n\nYours faithfully,\nCitizen / Resident",
    date: "25 Sep 2026",
  },
];

const SEVERITY_RANK = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

const getSeverityRank = (complaint) => {
  const sev = (complaint?.severity || "").toLowerCase().trim();
  if (SEVERITY_RANK[sev]) return SEVERITY_RANK[sev];
  const pri = (complaint?.priority || "").toLowerCase().trim();
  if (pri === "urgent" || pri === "critical") return 1;
  if (pri === "high") return 2;
  if (pri === "medium") return 3;
  if (pri === "low") return 4;
  return 5;
};

const getComplaintPriority = (complaint) => {
  const sev = (complaint?.severity || "").toLowerCase().trim();
  if (sev === "critical") return "Urgent";
  if (sev === "high") return "High";
  if (sev === "medium") return "Medium";
  if (sev === "low") return "Low";

  const pri = (complaint?.priority || "").toLowerCase().trim();
  if (pri === "urgent" || pri === "critical") return "Urgent";
  if (pri === "high") return "High";
  if (pri === "medium") return "Medium";
  if (pri === "low") return "Low";

  return "Medium";
};

function AuthorityDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [authority, setAuthority] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  // KPI filter
  const [activeKpi, setActiveKpi] = useState("All");

  useEffect(() => {
    const token = localStorage.getItem("civicroute_authority_token");
    const savedAuthority = JSON.parse(
      localStorage.getItem("civicroute_authority") || "null"
    );
    setAuthority(savedAuthority);

    // Fetch live authority profile from backend
    if (token) {
      fetch(`${API_BASE_URL}/auth/authority/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((liveProfile) => {
          if (liveProfile) {
            setAuthority(liveProfile);
            localStorage.setItem(
              "civicroute_authority",
              JSON.stringify(liveProfile)
            );
          }
        })
        .catch((err) => console.warn("Could not fetch live authority profile:", err));
    }

    const loadComplaints = async () => {
      try {
        const token = localStorage.getItem("civicroute_authority_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE_URL}/complaints`, { headers });
        if (response.ok) {
          const serverComplaints = await response.json();
          if (serverComplaints && serverComplaints.length > 0) {
            const normalized = serverComplaints.map((item) => ({
              ...item,
              id: item.complaint_id || item.id,
            }));
            setComplaints(normalized);
            localStorage.setItem(
              "civicroute_complaints",
              JSON.stringify(normalized)
            );
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch server complaints:", err);
      }

      const saved = JSON.parse(
        localStorage.getItem("civicroute_complaints") || "[]"
      );
      setComplaints(saved.length ? saved : demoComplaints);
    };

    loadComplaints();
  }, []);

  // -----------------------------
  // DEPARTMENT FILTER
  // -----------------------------

  const departmentComplaints = useMemo(() => {
    if (!authority) return [];

    let list = [];
    if (authority.role === "admin") {
      list = complaints;
    } else {
      const authorityDepartment =
        authority.department?.toLowerCase().trim();

      list = complaints.filter((item) => {
        const complaintDepartment =
          item.department?.toLowerCase().trim();

        return complaintDepartment === authorityDepartment;
      });
    }

    // Sort strictly by severity order: Critical (1), High (2), Medium (3), Low (4)
    return [...list].sort((a, b) => {
      const rankA = getSeverityRank(a);
      const rankB = getSeverityRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return (b.id || "").toString().localeCompare((a.id || "").toString());
    });
  }, [complaints, authority]);

  // -----------------------------
  // KPI COUNTS
  // -----------------------------

  const totalComplaints = departmentComplaints.length;

  const underReview = departmentComplaints.filter(
    (item) => item.status === "Under Review"
  ).length;

  const inProgress = departmentComplaints.filter(
    (item) => item.status === "In Progress"
  ).length;

  const resolved = departmentComplaints.filter(
    (item) => item.status === "Resolved"
  ).length;

  // -----------------------------
  // KPI CLICK
  // -----------------------------

  const handleKpiClick = (filter) => {
    // Set selected KPI
    setActiveKpi(filter);

    // Clear search so it doesn't hide complaints
    setSearch("");

    // Move to Complaint Management
    setTimeout(() => {
      const section = document.getElementById(
        "complaint-management"
      );

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  // -----------------------------
  // FILTERED COMPLAINTS
  // -----------------------------

  const filteredComplaints = useMemo(() => {
    const value = search.toLowerCase().trim();

    let result = departmentComplaints;

    // KPI filter
    if (activeKpi !== "All") {
      result = result.filter(
        (item) => item.status === activeKpi
      );
    }

    // Search filter
    if (value) {
      result = result.filter((item) =>
        [
          item.id,
          item.issue,
          item.department,
          item.location,
          item.status,
          item.severity,
          item.priority,
        ]
          .join(" ")
          .toLowerCase()
          .includes(value)
      );
    }

    // Always sort filtered complaints: Critical -> High -> Medium -> Low
    return [...result].sort((a, b) => {
      const rankA = getSeverityRank(a);
      const rankB = getSeverityRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return (b.id || "").toString().localeCompare((a.id || "").toString());
    });
  }, [departmentComplaints, search, activeKpi]);

  // -----------------------------
  // PROBLEM ANALYTICS
  // -----------------------------

  const problemCounts = useMemo(() => {
    const counts = {};

    departmentComplaints.forEach((item) => {
      const issue = item.issue || "Civic Issue";
      counts[issue] = (counts[issue] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
      }));
  }, [departmentComplaints]);

  const maxProblemCount =
    problemCounts.length > 0 ? problemCounts[0].count : 1;

  // -----------------------------
  // AREA ANALYTICS
  // -----------------------------

  const areaCounts = useMemo(() => {
    const counts = {};

    departmentComplaints.forEach((item) => {
      const area = item.location || "Location not provided";

      if (!counts[area]) {
        counts[area] = {
          total: 0,
          issues: {},
        };
      }

      counts[area].total += 1;

      const issue = item.issue || "Civic Issue";

      counts[area].issues[issue] =
        (counts[area].issues[issue] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([area, data]) => {
        const mainIssue = Object.entries(data.issues).sort(
          (a, b) => b[1] - a[1]
        )[0];

        return {
          area,
          total: data.total,
          mainIssue: mainIssue
            ? mainIssue[0]
            : "Civic Issue",
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [departmentComplaints]);

  // -----------------------------
  // SEVERITY-BASED AI INSIGHTS (DYNAMIC)
  // -----------------------------

  const severityInsights = useMemo(() => {
    const list = departmentComplaints || [];
    const total = list.length;

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const criticalList = [];
    const highList = [];
    const seriousDeptMap = {};
    const seriousAreaMap = {};

    list.forEach((item) => {
      const sev = (item.severity || "Medium").toLowerCase().trim();
      const loc = (item.location || "").trim();
      const dept = item.department || "General Civic Services";

      if (sev === "critical") {
        counts.critical += 1;
        criticalList.push(item);
        seriousDeptMap[dept] = (seriousDeptMap[dept] || 0) + 1;
        if (loc && !["not provided", "location not provided", "n/a"].includes(loc.toLowerCase())) {
          seriousAreaMap[loc] = (seriousAreaMap[loc] || 0) + 1;
        }
      } else if (sev === "high") {
        counts.high += 1;
        highList.push(item);
        seriousDeptMap[dept] = (seriousDeptMap[dept] || 0) + 1;
        if (loc && !["not provided", "location not provided", "n/a"].includes(loc.toLowerCase())) {
          seriousAreaMap[loc] = (seriousAreaMap[loc] || 0) + 1;
        }
      } else if (sev === "low") {
        counts.low += 1;
      } else {
        counts.medium += 1;
      }
    });

    const departmentsWithSerious = Object.entries(seriousDeptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const seriousAreas = Object.entries(seriousAreaMap)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

    if (total === 0) {
      return {
        total: 0,
        counts,
        alertTitle: "No Active Complaints",
        alertText: "No complaints found for this view. Awaiting citizen reports.",
        summaryText: "No complaint data currently available for analysis.",
        recommendation: "System operating normally. Routine monitoring active.",
        departmentsWithSerious: [],
        seriousAreas: [],
      };
    }

    // 1. Dynamic Alert Text
    let alertTitle = "Status Normal";
    let alertText = "";
    if (counts.critical > 0) {
      alertTitle = "Critical Hazard Alert";
      const sampleIssues = [...new Set(criticalList.map((c) => c.issue))].slice(0, 3).join(", ");
      alertText = `${counts.critical} Critical (Urgent) issue${counts.critical > 1 ? "s" : ""} detected (${sampleIssues}). Public health or safety hazard requires immediate containment.`;
    } else if (counts.high > 0) {
      alertTitle = "High Attention Alert";
      const sampleIssues = [...new Set(highList.map((c) => c.issue))].slice(0, 3).join(", ");
      alertText = `${counts.high} High-severity issue${counts.high > 1 ? "s" : ""} reported (${sampleIssues}). Prioritize field assessment to prevent escalation.`;
    } else {
      alertText = `All ${total} current complaint${total > 1 ? "s are" : " is"} classified under standard Medium/Low priority. No acute hazards detected.`;
    }

    // 2. Dynamic Narrative Summary
    const summaryParts = [];
    summaryParts.push(
      `Dataset analysis of ${total} report${total > 1 ? "s" : ""}: ${counts.critical} Critical (Urgent), ${counts.high} High, ${counts.medium} Medium, and ${counts.low} Low severity.`
    );

    if (departmentsWithSerious.length > 0) {
      const deptDetails = departmentsWithSerious.map((d) => `${d.name} (${d.count})`).join(", ");
      summaryParts.push(`Departments handling serious (Critical/High) complaints: ${deptDetails}.`);
    }

    if (seriousAreas.length > 0) {
      const areaDetails = seriousAreas.map((a) => `${a.area} (${a.count})`).join(", ");
      summaryParts.push(`Key areas reporting serious issues: ${areaDetails}.`);
    } else if (counts.critical > 0 || counts.high > 0) {
      summaryParts.push("Specific street/GPS locations were not provided for these serious reports; citizen direct follow-up advised.");
    }

    // 3. Recommended Actions Based on Severity
    let recommendation = "";
    if (counts.critical > 0) {
      const targetArea = seriousAreas[0]?.area ? ` near ${seriousAreas[0].area}` : "";
      recommendation = `Emergency dispatch: Mobilize rapid response crews to inspect and isolate critical hazards${targetArea} within 2 to 4 hours.`;
    } else if (counts.high > 0) {
      const targetArea = seriousAreas[0]?.area ? ` in ${seriousAreas[0].area}` : "";
      recommendation = `Priority scheduling: Allocate municipal service crews to high-severity repairs${targetArea} within 24 hours.`;
    } else if (counts.medium > 0) {
      recommendation = "Standard workflow: Resolve medium-severity maintenance complaints within regular 3-5 day departmental service cycles.";
    } else {
      recommendation = "Routine maintenance: Address low-severity items during scheduled local maintenance rounds.";
    }

    return {
      total,
      counts,
      alertTitle,
      alertText,
      summaryText: summaryParts.join(" "),
      recommendation,
      departmentsWithSerious,
      seriousAreas,
    };
  }, [departmentComplaints]);

  // -----------------------------
  // STATUS UPDATE
  // -----------------------------

  
const updateStatus = async () => {
  if (!selectedComplaint || !newStatus) return;

  try {
    const token = localStorage.getItem("civicroute_authority_token");
    const response = await fetch(
      `${API_BASE_URL}/complaints/${selectedComplaint.id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: `Status updated to ${newStatus} by ${authority?.name || 'Officer'}.`,
          updated_by: authority?.name || "Officer"
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to update complaint status"
      );
    }

    setComplaints((previousComplaints) => {
      const updated = previousComplaints.map((complaint) =>
        complaint.id === selectedComplaint.id
          ? { ...complaint, status: data.status }
          : complaint
      );
      localStorage.setItem("civicroute_complaints", JSON.stringify(updated));
      return updated;
    });

    setSelectedComplaint((previous) => ({
      ...previous,
      status: data.status,
    }));

    alert("Complaint status updated successfully!");
  } catch (error) {
    console.error("Status update error:", error);
    alert(
      typeof error.message === "string"
        ? error.message
        : "Could not update complaint status."
    );
  }
};


  const openComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
  };

  const getMarkerClass = (issue = "") => {
    const value = issue.toLowerCase();

    if (value.includes("road")) return "road";
    if (value.includes("water")) return "water";

    if (
      value.includes("garbage") ||
      value.includes("sanitation")
    ) {
      return "sanitation";
    }

    if (value.includes("street")) return "streetlight";

    return "other";
  };

  return (
    <div className="min-h-screen bg-[#eef3f9] text-slate-900">

      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">

          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                CivicRoute
              </h1>

              <p className="text-xs font-medium text-slate-500">
                Authority Intelligence Portal
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {authority?.name || "Department Officer"}
              </p>

              <p className="text-xs text-slate-500">
                {authority?.department || "Authority Portal"}
              </p>
            </div>

            <div className="relative">

              <button
                onClick={() =>
                  setShowNotifications(!showNotifications)
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <Bell size={18} />

                {totalComplaints > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="font-semibold text-slate-900">
                    Notifications
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {totalComplaints} complaints currently
                    available for review.
                  </p>
                </div>
              )}

            </div>

            <button
              onClick={() => {
                localStorage.removeItem("civicroute_authority_token");
                localStorage.removeItem("civicroute_authority");
                window.location.href = "/authority/login";
              }}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex cursor-pointer"
            >
              <LogOut size={16} />
              Logout
            </button>

          </div>
        </div>
      </header>

      {/* MAIN */}

      <main className="relative mx-auto max-w-[1500px] px-6 py-8">

        {/* PAGE TITLE */}

        <div className="mb-7">

          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
            <BarChart3 size={17} />
            Civic Intelligence
          </div>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {authority?.role === "admin"
              ? "Community Problem Overview"
              : `${authority?.department || "Department"} Overview`}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {authority?.role === "admin"
              ? "Understand where civic problems are occurring, which issues are most common, and where authorities may need to prioritize action."
              : `Monitor ${
                  authority?.department || "department"
                } complaints, identify problem hotspots, and prioritize action.`}
          </p>
        </div>

        {/* KPI CARDS */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL */}

          <button
            type="button"
            onClick={() => handleKpiClick("All")}
            className={`w-full cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg ${
              activeKpi === "All"
                ? "border-indigo-300 ring-2 ring-indigo-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">

              <p className="font-semibold text-slate-600">
                Total Complaints
              </p>

              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                <FileText size={19} />
              </div>

            </div>

            <p className="mt-4 text-3xl font-bold text-slate-950">
              {totalComplaints}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Reports received
            </p>
          </button>

          {/* UNDER REVIEW */}

          <button
            type="button"
            onClick={() => handleKpiClick("Under Review")}
            className={`w-full cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg ${
              activeKpi === "Under Review"
                ? "border-amber-300 ring-2 ring-amber-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">

              <p className="font-semibold text-slate-600">
                Under Review
              </p>

              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Clock3 size={19} />
              </div>

            </div>

            <p className="mt-4 text-3xl font-bold text-slate-950">
              {underReview}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Awaiting action
            </p>
          </button>

          {/* IN PROGRESS */}

          <button
            type="button"
            onClick={() => handleKpiClick("In Progress")}
            className={`w-full cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg ${
              activeKpi === "In Progress"
                ? "border-blue-300 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">

              <p className="font-semibold text-slate-600">
                In Progress
              </p>

              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <TrendingUp size={19} />
              </div>

            </div>

            <p className="mt-4 text-3xl font-bold text-slate-950">
              {inProgress}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Currently being handled
            </p>
          </button>

          {/* RESOLVED */}

          <button
            type="button"
            onClick={() => handleKpiClick("Resolved")}
            className={`w-full cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg ${
              activeKpi === "Resolved"
                ? "border-emerald-300 ring-2 ring-emerald-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">

              <p className="font-semibold text-slate-600">
                Resolved
              </p>

              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CheckCircle2 size={19} />
              </div>

            </div>

            <p className="mt-4 text-3xl font-bold text-slate-950">
              {resolved}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Successfully closed
            </p>
          </button>

        </section>

        {/* ACTIVE KPI FILTER */}

        {activeKpi !== "All" && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Showing
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {activeKpi} Complaints
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleKpiClick("All")}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100"
            >
              Show All
            </button>

          </div>
        )}

        {/* MAP + TOP PROBLEMS */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">

          {/* MAP */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

              <div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600" />

                  <h3 className="font-bold text-slate-900">
                    Complaint Hotspot Map
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Geographic view of reported civic problems
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFullMap(true)}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Live Demo
              </button>

            </div>

            <div className="h-[430px] w-full">

              <MapContainer
                center={[17.462, 78.445]}
                zoom={12}
                scrollWheelZoom={false}
                className="h-full w-full"
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {departmentComplaints.map((complaint) => {

                  const coordinates = getComplaintCoordinates(complaint);

                  if (!coordinates) return null;

                  return (
                    <CircleMarker
                      key={complaint.id}
                      center={coordinates}
                      radius={10}
                      pathOptions={{
                        color:
                          getMarkerClass(complaint.issue) === "road"
                            ? "#dc2626"
                            : getMarkerClass(complaint.issue) ===
                              "water"
                            ? "#2563eb"
                            : getMarkerClass(
                                  complaint.issue
                                ) === "sanitation"
                            ? "#ca8a04"
                            : getMarkerClass(
                                  complaint.issue
                                ) === "streetlight"
                            ? "#9333ea"
                            : "#475569",
                        fillOpacity: 0.75,
                      }}
                    >

                      <Popup>

                        <div className="min-w-[190px]">

                          <p className="font-bold text-slate-900">
                            {complaint.id}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {complaint.issue}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {complaint.location}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-indigo-600">
                            {complaint.status}
                          </p>

                        </div>

                      </Popup>

                    </CircleMarker>
                  );
                })}

              </MapContainer>

            </div>

            {/* MAP LEGEND */}

            <div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-3">

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                Roads
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Water
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-full bg-yellow-600" />
                Sanitation
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-full bg-purple-600" />
                Streetlights
              </div>

            </div>

          </div>

          {/* TOP PROBLEMS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" />

                  <h3 className="font-bold text-slate-900">
                    Most Reported Problems
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Which civic issues are occurring most?
                </p>
              </div>

            </div>

            <div className="mt-6 space-y-5">

              {problemCounts.length === 0 ? (

                <p className="text-sm text-slate-500">
                  No complaint data available yet.
                </p>

              ) : (

                problemCounts.slice(0, 6).map((item, index) => {

                  const percentage =
                    (item.count / maxProblemCount) * 100;

                  return (
                    <div key={item.name}>

                      <div className="mb-2 flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {index + 1}
                          </span>

                          <span className="text-sm font-semibold text-slate-800">
                            {item.name}
                          </span>

                        </div>

                        <span className="text-sm font-bold text-slate-900">
                          {item.count}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                })

              )}

            </div>

            <div className="mt-7 rounded-xl bg-indigo-50 p-4">

              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Most Frequent Issue (Volume Hotspot)
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {problemCounts[0]?.name || "Awaiting data"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                Highest report volume ({problemCounts[0]?.count || 0} reports). Used for workload planning, not individual urgency.
              </p>

            </div>

          </div>

        </section>

        {/* HOTSPOTS + AI */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.25fr]">

          {/* AREA HOTSPOTS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-indigo-600" />

              <h3 className="font-bold text-slate-900">
                Complaint Hotspots
              </h3>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Areas with the highest number of reports
            </p>

            <div className="mt-5 space-y-3">

              {areaCounts.length === 0 ? (

                <p className="text-sm text-slate-500">
                  No area data available.
                </p>

              ) : (

                areaCounts.slice(0, 5).map((area, index) => (

                  <div
                    key={area.area}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-indigo-600 shadow-sm">
                        {index + 1}
                      </div>

                      <div>

                        <p className="text-sm font-bold text-slate-800">
                          {area.area}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Main issue: {area.mainIssue}
                        </p>

                      </div>

                    </div>

                    <div className="text-right">

                      <p className="text-lg font-bold text-slate-900">
                        {area.total}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        complaints
                      </p>

                    </div>

                  </div>

                ))

              )}

            </div>

          </div>

          {/* AI INSIGHT */}

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-6 text-white shadow-lg shadow-blue-700/20">

            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                    <Lightbulb size={22} className="text-amber-300" />
                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                      AI Severity & Risk Intelligence
                    </p>

                    <h3 className="mt-0.5 text-xl font-bold">
                      Severity-Based Civic Insights
                    </h3>

                  </div>

                </div>

                {/* Severity Breakdown Pills */}
                <div className="flex flex-wrap items-center gap-1.5">

                  <span className="flex items-center gap-1.5 rounded-full bg-rose-500/25 border border-rose-400/40 px-2.5 py-1 text-xs font-bold text-rose-200">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    Critical: {severityInsights.counts.critical}
                  </span>

                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500/25 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    High: {severityInsights.counts.high}
                  </span>

                  <span className="flex items-center gap-1.5 rounded-full bg-blue-500/25 border border-blue-400/40 px-2.5 py-1 text-xs font-medium text-blue-200">
                    Medium: {severityInsights.counts.medium}
                  </span>

                  <span className="flex items-center gap-1.5 rounded-full bg-slate-500/25 border border-slate-400/40 px-2.5 py-1 text-xs font-medium text-slate-300">
                    Low: {severityInsights.counts.low}
                  </span>

                </div>

              </div>

              {/* Dynamic Severity Alert */}
              <div className={`mt-5 rounded-xl border p-4 backdrop-blur-sm ${
                severityInsights.counts.critical > 0
                  ? "border-rose-400/40 bg-rose-950/40 text-rose-100"
                  : severityInsights.counts.high > 0
                  ? "border-amber-400/40 bg-amber-950/40 text-amber-100"
                  : "border-blue-400/30 bg-blue-950/30 text-blue-100"
              }`}>

                <div className="flex items-start gap-2.5">

                  <AlertCircle size={18} className={`shrink-0 mt-0.5 ${
                    severityInsights.counts.critical > 0
                      ? "text-rose-400"
                      : severityInsights.counts.high > 0
                      ? "text-amber-400"
                      : "text-blue-300"
                  }`} />

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wide">
                      {severityInsights.alertTitle}
                    </p>

                    <p className="mt-0.5 text-sm font-semibold leading-relaxed">
                      {severityInsights.alertText}
                    </p>

                  </div>

                </div>

              </div>

              {/* Dynamic Narrative Summary */}
              <div className="mt-3.5 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">

                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Severity Breakdown & Reported Locations
                </p>

                <p className="mt-1 text-sm leading-relaxed text-blue-50">
                  {severityInsights.summaryText}
                </p>

              </div>

              {/* Recommended Action */}
              <div className="mt-3.5 rounded-xl border border-emerald-400/40 bg-emerald-950/30 p-4 backdrop-blur-sm">

                <div className="flex items-start gap-2.5">

                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Recommended Action
                    </p>

                    <p className="mt-0.5 text-sm font-medium text-emerald-100">
                      {severityInsights.recommendation}
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-200">

                <div className="flex items-center gap-2">
                  <SparkleIcon />
                  Dynamically generated from actual complaint data
                </div>

                <span className="font-medium text-blue-300">
                  Queue Priority: Critical &rarr; High &rarr; Medium &rarr; Low
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* COMPLAINT MANAGEMENT */}

        <section
          id="complaint-management"
          className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">

            <div>

              <h3 className="font-bold text-slate-900">
                Complaint Management
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {activeKpi === "All"
                  ? "Review complaints and update their status."
                  : `Showing ${activeKpi.toLowerCase()} complaints.`}
              </p>

            </div>

            <div className="relative w-full md:w-80">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search complaints..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white"
              />

            </div>

          </div>

          {/* FILTER RESULT BAR */}

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">

            <div className="flex items-center gap-2">

              <span className="text-xs font-medium text-slate-500">
                Current view:
              </span>

              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {activeKpi === "All"
                  ? "All Complaints"
                  : activeKpi}
              </span>

            </div>

            <span className="text-xs font-semibold text-slate-500">
              {filteredComplaints.length} complaint
              {filteredComplaints.length === 1 ? "" : "s"}
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px]">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Complaint
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredComplaints.map((complaint) => (

                  <tr
                    key={complaint.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >

                    <td className="px-5 py-4">

                      <p className="font-bold text-indigo-600">
                        {complaint.id}
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {complaint.issue}
                      </p>

                    </td>

                    <td className="px-5 py-4">

                      <p className="text-sm font-semibold text-slate-700">
                        {complaint.department}
                      </p>

                    </td>

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} />
                        {complaint.location || "Not provided"}
                      </div>

                    </td>

                    <td className="px-5 py-4">

                      <div className="flex flex-col gap-1">

                        <span
                          className={`inline-flex items-center w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            getComplaintPriority(complaint) === "Urgent"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : getComplaintPriority(complaint) === "High"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : getComplaintPriority(complaint) === "Medium"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {getComplaintPriority(complaint)}
                        </span>

                        <span className="text-[11px] text-slate-500">
                          Sev: {complaint.severity || "Medium"}
                        </span>

                      </div>

                    </td>

                    <td className="px-5 py-4">

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          complaint.status === "Resolved"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : complaint.status === "In Progress"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : complaint.status === "Under Review"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {complaint.status}
                      </span>

                    </td>

                    <td className="px-5 py-4">

                      <button
                        onClick={() =>
                          openComplaint(complaint)
                        }
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Review
                        <ChevronRight size={14} />
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredComplaints.length === 0 && (
              <div className="px-6 py-12 text-center">

                <AlertCircle
                  className="mx-auto text-slate-300"
                  size={32}
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No complaints found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try a different search or select another
                  complaint category.
                </p>

              </div>
            )}

          </div>

        </section>

      </main>

      {/* REVIEW MODAL */}

      {selectedComplaint && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Complaint Review
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedComplaint.id}
                </h3>

              </div>

              <button
                onClick={() =>
                  setSelectedComplaint(null)
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-6 p-6">

              {/* COMPLAINANT CITIZEN DETAILS */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Verified Complainant Details
                    </span>
                  </div>
                  {selectedComplaint.citizen_id ? (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      Citizen ID: #{selectedComplaint.citizen_id}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      Guest / Not registered
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-indigo-50/80 shadow-xs">
                    <p className="text-[11px] font-medium text-slate-500">Complainant Name</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                      {selectedComplaint.citizen_name || "Not provided / Anonymous"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-indigo-50/80 shadow-xs">
                    <p className="text-[11px] font-medium text-slate-500">Phone Number</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                      {selectedComplaint.citizen_phone ? (
                        <a href={`tel:${selectedComplaint.citizen_phone}`} className="text-indigo-600 hover:underline">
                          {selectedComplaint.citizen_phone}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3 border border-indigo-50/80 shadow-xs">
                    <p className="text-[11px] font-medium text-slate-500">Email Address</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                      {selectedComplaint.citizen_email ? (
                        <a href={`mailto:${selectedComplaint.citizen_email}`} className="text-indigo-600 hover:underline">
                          {selectedComplaint.citizen_email}
                        </a>
                      ) : (
                        "Not provided"
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Authorized for {authority?.department || "department"} officers and central administrators.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <InfoBox
                  label="Issue"
                  value={selectedComplaint.issue}
                />

                <InfoBox
                  label="Department"
                  value={selectedComplaint.department}
                />

                <InfoBox
                  label="Location"
                  value={
                    selectedComplaint.location ||
                    "Not provided"
                  }
                />

                <InfoBox
                  label="Severity"
                  value={
                    selectedComplaint.severity ||
                    "Medium"
                  }
                />

                <InfoBox
                  label="Priority"
                  value={getComplaintPriority(selectedComplaint)}
                />

              </div>

              <div>

                <p className="text-sm font-bold text-slate-900">
                  Citizen Description
                </p>

                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {selectedComplaint.description ||
                    "No description available."}
                </div>

              </div>

              {selectedComplaint.image && (
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Attached Photograph
                  </p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <img
                      src={selectedComplaint.image}
                      alt="Complaint attachment"
                      className="max-h-80 w-full rounded-lg object-contain bg-white"
                    />
                  </div>
                </div>
              )}

              <div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={17}
                      className="text-indigo-600"
                    />

                    <p className="text-sm font-bold text-slate-900">
                      Official Complaint Letter
                    </p>

                    {selectedComplaint.final_letter && selectedComplaint.final_letter !== selectedComplaint.letter && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Citizen Approved
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        const content = selectedComplaint.final_letter || selectedComplaint.letter || "No complaint letter available.";
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>CivicRoute Official Letter - ${selectedComplaint.id}</title>
                              <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                                .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
                                .title { font-size: 20px; font-weight: bold; color: #1e3a8a; }
                                .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
                                .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
                                .letter { white-space: pre-line; font-size: 14px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="title">CivicRoute &ndash; Official Complaint Letter</div>
                                <div class="sub">Municipal & Authority Dispatch Copy</div>
                              </div>
                              <div class="meta">
                                <strong>Complaint ID:</strong> ${selectedComplaint.id} &nbsp;|&nbsp;
                                <strong>Department:</strong> ${selectedComplaint.department} &nbsp;|&nbsp;
                                <strong>Severity:</strong> ${selectedComplaint.severity || 'Medium'} &nbsp;|&nbsp;
                                <strong>Priority:</strong> ${getComplaintPriority(selectedComplaint)} &nbsp;|&nbsp;
                                <strong>Status:</strong> ${selectedComplaint.status}
                              </div>
                              <div class="letter">${content}</div>
                              <script>window.onload = function() { window.print(); };</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={13} className="text-indigo-600" />
                    Download / Print Letter
                  </button>
                </div>

                <div className="mt-2 whitespace-pre-line rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
                  {selectedComplaint.final_letter || selectedComplaint.letter ||
                    "No complaint letter available."}
                </div>

              </div>

              <div>

                <p className="text-sm font-bold text-slate-900">
                  Update Status
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {STATUS_OPTIONS.map((status) => (

                    <button
                      key={status}
                      onClick={() =>
                        setNewStatus(status)
                      }
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        newStatus === status
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                      }`}
                    >
                      {status}
                    </button>

                  ))}

                </div>

                <button
                  onClick={updateStatus}
                  className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                  Update Complaint Status
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* FULL MAP */}

      {showFullMap && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 p-4 backdrop-blur-sm">

          <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="absolute left-0 right-0 top-0 z-[1001] flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  CivicRoute Intelligence
                </p>

                <h3 className="text-lg font-bold text-slate-900">
                  Complaint Hotspot Map
                </h3>

              </div>

              <button
                type="button"
                onClick={() => setShowFullMap(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>

            </div>

            <MapContainer
              center={[17.462, 78.445]}
              zoom={12}
              scrollWheelZoom={true}
              className="h-full w-full"
            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {departmentComplaints.map((complaint) => {

                const coordinates = getComplaintCoordinates(complaint);

                if (!coordinates) return null;

                return (
                  <CircleMarker
                    key={complaint.id}
                    center={coordinates}
                    radius={11}
                    pathOptions={{
                      color:
                        getMarkerClass(complaint.issue) ===
                        "road"
                          ? "#dc2626"
                          : getMarkerClass(
                                complaint.issue
                              ) === "water"
                          ? "#2563eb"
                          : getMarkerClass(
                                complaint.issue
                              ) === "sanitation"
                          ? "#ca8a04"
                          : getMarkerClass(
                                complaint.issue
                              ) === "streetlight"
                          ? "#9333ea"
                          : "#475569",
                      fillOpacity: 0.8,
                    }}
                  >
                    <Popup>

                      <div className="min-w-[190px]">

                        <p className="font-bold text-slate-900">
                          {complaint.id}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {complaint.issue}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {complaint.location}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-indigo-600">
                          {complaint.status}
                        </p>

                      </div>

                    </Popup>
                  </CircleMarker>
                );
              })}

            </MapContainer>

          </div>
        </div>
      )}

    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

function SparkleIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      ✦
    </span>
  );
}

export default AuthorityDashboard;