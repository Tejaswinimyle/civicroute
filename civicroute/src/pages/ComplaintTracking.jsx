import { API_BASE_URL } from "../apiConfig";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  FileText,
  Circle,
  RefreshCw,
} from "lucide-react";

const API_URL = API_BASE_URL;

const steps = [
  {
    label: "Submitted",
    description: "Complaint submitted successfully",
  },
  {
    label: "Under Review",
    description: "Complaint is being reviewed by the department",
  },
  {
    label: "In Progress",
    description: "The concerned department is working on the issue",
  },
  {
    label: "Resolved",
    description: "The complaint has been resolved",
  },
];

function ComplaintTracking() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchComplaint = async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await fetch(`${API_URL}/complaints`);

        if (!response.ok) {
          throw new Error("Unable to load complaints from the server.");
        }

        const data = await response.json();

        const serverComplaint = data.find(
          (item) => item.complaint_id === id
        );

        if (serverComplaint) {
          const normalizedComplaint = {
            ...serverComplaint,
            id: serverComplaint.complaint_id,
          };

          if (!cancelled) {
            setComplaint(normalizedComplaint);
          }

          // Keep the local copy in sync with the server.
          const savedComplaints = JSON.parse(
            localStorage.getItem("civicroute_complaints") || "[]"
          );

          const updatedLocalComplaints = savedComplaints.map((item) =>
            item.id === id
              ? { ...item, ...normalizedComplaint }
              : item
          );

          localStorage.setItem(
            "civicroute_complaints",
            JSON.stringify(updatedLocalComplaints)
          );
        } else {
          if (!cancelled) {
            setComplaint(null);
          }
        }
      } catch (err) {
        console.error("Complaint tracking error:", err);

        if (!cancelled) {
          setError(
            "Could not connect to CivicRoute. Check that the backend is running and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchComplaint();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/complaints`);

      if (!response.ok) {
        throw new Error("Could not refresh complaint status.");
      }

      const data = await response.json();
      const serverComplaint = data.find(
        (item) => item.complaint_id === id
      );

      if (serverComplaint) {
        setComplaint({
          ...serverComplaint,
          id: serverComplaint.complaint_id,
        });
      } else {
        setComplaint(null);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4fb] px-6">
        <div className="text-center">
          <RefreshCw className="mx-auto animate-spin text-blue-600" size={30} />
          <p className="mt-4 font-medium text-slate-600">
            Loading your complaint...
          </p>
        </div>
      </div>
    );
  }

  if (error && !complaint) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4fb] px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Unable to Load Complaint
          </h1>
          <p className="mt-3 text-sm text-slate-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/complaints")}
            className="mt-3 block w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to My Complaints
          </button>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4fb] px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Complaint Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We couldn't find a complaint with this ID.
          </p>
          <button
            onClick={() => navigate("/complaints")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to My Complaints
          </button>
        </div>
      </div>
    );
  }

  const statusIndex = steps.findIndex(
    (step) => step.label === complaint.status
  );
  const currentIndex = statusIndex === -1 ? 0 : statusIndex;

  return (
    <div className="min-h-screen bg-[#eef4fb] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/complaints")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to My Complaints
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FileText size={18} />
            </div>
            <span className="font-bold text-slate-900">CivicRoute</span>
          </div>
        </div>

        {/* Title */}
        <div className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Complaint Tracking
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Track your complaint
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Follow the progress of your complaint from submission to resolution.
          </p>
        </div>

        {/* Complaint Summary */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Complaint ID
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-wide text-blue-600">
                {complaint.id}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {complaint.issue}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {complaint.department}
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-500">Current Status</p>
              <p className="mt-1 font-bold text-blue-700">
                {complaint.status}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          <div className="mt-5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>

          {/* Details */}
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Reported On</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {complaint.date || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Priority</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {complaint.priority || "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin size={13} />
                Location
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {complaint.location || "Not provided"}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Complaint Description
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {complaint.description}
            </p>
          </div>

          {/* Attached Photograph */}
          {complaint.image && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attached Photograph
              </p>
              <div className="mt-3 overflow-hidden rounded-xl bg-slate-50">
                <img
                  src={complaint.image}
                  alt="Complaint photograph"
                  className="max-h-80 rounded-lg object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <Clock3 size={21} className="text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-900">
                Complaint Progress
              </h2>
              <p className="text-sm text-slate-500">
                Current progress of your complaint
              </p>
            </div>
          </div>

          <div className="mt-8">
            {steps.map((step, index) => {
              const completed = index <= currentIndex;
              const current = index === currentIndex;

              return (
                <div key={step.label} className="relative flex gap-4">
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute left-[11px] top-7 h-16 w-[2px] ${
                        index < currentIndex
                          ? "bg-blue-600"
                          : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div className="relative z-10 shrink-0">
                    {completed ? (
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          current
                            ? "bg-blue-600 text-white"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
                        <Circle size={8} className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="pb-10">
                    <p
                      className={`text-sm font-bold ${
                        completed ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Official Letter */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <FileText size={21} className="text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-900">
                Submitted Complaint Letter
              </h2>
              <p className="text-sm text-slate-500">
                Official complaint submitted through CivicRoute
              </p>
            </div>
          </div>

          <pre className="mt-5 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            {complaint.letter || "No complaint letter is available."}
          </pre>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}

export default ComplaintTracking;
