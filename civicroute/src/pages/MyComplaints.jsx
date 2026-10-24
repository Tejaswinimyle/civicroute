import { API_BASE_URL } from "../apiConfig";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileText,
  MapPin,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function MyComplaints() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Complaint selected for deletion
  const [deleteComplaint, setDeleteComplaint] = useState(null);

  // ---------------------------------------------------------
  // GET COMPLAINTS FROM BACKEND
  // ---------------------------------------------------------

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const citizenToken = localStorage.getItem("civicroute_citizen_token");
        const headers = citizenToken ? { "Authorization": `Bearer ${citizenToken}` } : {};
        const response = await fetch(
          `${API_BASE_URL}/complaints`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch complaints");
        }

        const data = await response.json();

        setComplaints(data);
      } catch (error) {
        console.error("Error fetching complaints:", error);

        setErrorMessage(
          "Unable to load complaints. Please make sure the CivicRoute backend is running."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  // ---------------------------------------------------------
  // DELETE COMPLAINT
  // ---------------------------------------------------------

  const handleDeleteComplaint = async () => {
    if (!deleteComplaint) return;

    try {
      await fetch(
        `${API_BASE_URL}/complaints/${deleteComplaint.complaint_id}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.warn("Could not delete from backend:", err);
    }

    setComplaints((previous) =>
      previous.filter(
        (complaint) =>
          complaint.complaint_id !== deleteComplaint.complaint_id
      )
    );

    const saved = JSON.parse(
      localStorage.getItem("civicroute_complaints") || "[]"
    );
    const updated = saved.filter(
      (c) => (c.complaint_id || c.id) !== deleteComplaint.complaint_id
    );
    localStorage.setItem("civicroute_complaints", JSON.stringify(updated));

    setDeleteComplaint(null);
  };

  return (
    <div className="min-h-screen bg-[#eef4fb] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/citizen/dashboard")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FileText size={18} />
            </div>

            <span className="font-bold text-slate-900">
              CivicRoute
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Citizen Portal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My Complaints
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and track the civic complaints you have submitted.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

            <p className="mt-5 text-sm font-medium text-slate-600">
              Loading your complaints...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && errorMessage && (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          </div>
        )}

        {/* No Complaints */}
        {!loading &&
          !errorMessage &&
          complaints.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FileText size={28} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                No complaints yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                When you submit a civic complaint, it will appear here
                with its complaint ID and current status.
              </p>

              <button
                onClick={() => navigate("/report")}
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Report an Issue
              </button>
            </div>
          )}

        {/* Complaints */}
        {!loading &&
          !errorMessage &&
          complaints.length > 0 && (
            <div className="mt-8 space-y-4">

              {complaints.map((complaint) => (
                <div
                  key={complaint.complaint_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-start gap-4">

                      {complaint.image ? (
                        <img
                          src={complaint.image}
                          alt="Complaint photo"
                          className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <FileText size={20} />
                        </div>
                      )}

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Complaint ID
                        </p>

                        <p className="mt-1 font-bold text-blue-600">
                          {complaint.complaint_id}
                        </p>

                        <h2 className="mt-2 text-base font-bold text-slate-900">
                          {complaint.issue}
                        </h2>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {complaint.department}
                        </p>

                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                      <Clock3 size={16} />
                      {complaint.status}
                    </div>

                  </div>

                  <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin
                        size={16}
                        className="text-slate-400"
                      />

                      {complaint.location || "Location not provided"}
                    </div>

                    <div className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Priority:
                      </span>{" "}
                      {complaint.priority}
                    </div>

                    <div className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Reported:
                      </span>{" "}
                      {complaint.date}
                    </div>

                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-5 flex items-center justify-end gap-4">

                    {/* DELETE */}
                    <button
                      onClick={() =>
                        setDeleteComplaint(complaint)
                      }
                      className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>

                    {/* TRACK */}
                    <button
                      onClick={() =>
                        navigate(
                          `/complaints/${complaint.complaint_id}`
                        )
                      }
                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Track Complaint
                      <ArrowRight size={17} />
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}
      </div>

      {/* =====================================================
          DELETE CONFIRMATION POPUP
          ===================================================== */}

      {deleteComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-5 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">

            {/* Popup Header */}
            <div className="flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                  <Trash2
                    size={21}
                    className="text-red-600"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Delete Complaint?
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Please confirm this action.
                  </p>
                </div>

              </div>

              {/* Close */}
              <button
                onClick={() => setDeleteComplaint(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>

            </div>

            {/* Popup Message */}
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">

              <p className="text-sm leading-6 text-slate-700">
                Are you sure you want to delete complaint{" "}
                <span className="font-bold text-red-600">
                  {deleteComplaint.complaint_id}
                </span>
                ?
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                This complaint will be removed from your My
                Complaints page. The authority record will be
                preserved.
              </p>

            </div>

            {/* Popup Buttons */}
            <div className="mt-6 flex gap-3">

              {/* CANCEL */}
              <button
                onClick={() => setDeleteComplaint(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              {/* DELETE */}
              <button
                onClick={handleDeleteComplaint}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Complaint
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default MyComplaints;
