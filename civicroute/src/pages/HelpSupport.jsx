import { API_BASE_URL } from "../apiConfig";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleHelp,
  BookOpen,
  Camera,
  Bot,
  Search,
  ChevronDown,
  Mail,
  Bug,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  X,
  FileText,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  PhoneCall,
} from "lucide-react";

// Configurable support email address from Vite environment or default
const DEFAULT_SUPPORT_EMAIL =
  import.meta.env?.VITE_SUPPORT_EMAIL || "support@civicroute.org";

export default function HelpSupport() {
  const navigate = useNavigate();

  // Support email state (can also fetch from backend /support/info)
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Active guide tab
  const [activeGuideTab, setActiveGuideTab] = useState("all");

  // Report a problem modal state
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemCategory, setProblemCategory] = useState("Bug Report");
  const [problemDescription, setProblemDescription] = useState("");
  const [problemEmail, setProblemEmail] = useState("");
  const [isSubmittingProblem, setIsSubmittingProblem] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState(null);
  const [problemError, setProblemError] = useState("");

  // Fetch live support info on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/support/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.support_email) {
          setSupportEmail(data.support_email);
        }
      })
      .catch((err) =>
        console.warn("Using default configurable support email:", err)
      );

    // Pre-populate citizen email if logged in
    const cachedCitizen = JSON.parse(
      localStorage.getItem("civicroute_logged_in_citizen") || "null"
    );
    if (cachedCitizen?.email) {
      setProblemEmail(cachedCitizen.email);
    }
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleReportProblem = async (e) => {
    e.preventDefault();
    setProblemError("");

    if (!problemDescription.trim()) {
      setProblemError("Please provide a description of the issue encountered.");
      return;
    }

    setIsSubmittingProblem(true);

    try {
      const res = await fetch(`${API_BASE_URL}/support/report-problem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: problemCategory,
          description: problemDescription.trim(),
          email: problemEmail.trim() || undefined,
          page_url: window.location.pathname,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to submit problem report.");
      }

      setProblemSuccess(data);
      setProblemDescription("");
    } catch (err) {
      console.error("Problem report error:", err);
      setProblemError(
        err.message ||
          "Failed to submit problem report. Please reach out to support directly."
      );
    } finally {
      setIsSubmittingProblem(false);
    }
  };

  // Guide Steps definition
  const guideSections = [
    {
      id: "register-login",
      title: "1. How to Register & Log In",
      category: "account",
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            Citizens can access CivicRoute to submit problems, view complaint history, and receive official departmental responses.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>
              <strong>Creating an Account:</strong> Click <em>"Create an Account"</em> on the citizen login page. Enter your full name, email address, optional contact phone number, and password (min. 6 characters).
            </li>
            <li>
              <strong>Logging In:</strong> Use either your registered email address or your 10-digit mobile number along with your password.
            </li>
            <li>
              <strong>Password Recovery:</strong> If you forgot your password, click <em>"Forgot password?"</em> to receive a secure, 1-hour single-use reset link or token.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "submit-complaint",
      title: "2. How to Submit a Civic Complaint",
      category: "complaint",
      icon: FileText,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            Submitting a complaint is fast, transparent, and routed directly to the appropriate municipal authority:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
            <li>Navigate to <strong>"File a Complaint"</strong> from your citizen dashboard or navigation bar.</li>
            <li>Type a brief description of the issue or click <strong>"Speak"</strong> for voice-to-text dictation.</li>
            <li>Enter your location manually or tap <strong>"Use My Current Location"</strong> for high-accuracy GPS coordinates.</li>
            <li>CivicRoute will analyze your input, ask relevant follow-up questions if details are missing, and generate an official municipal complaint letter.</li>
            <li>You can review, edit, and approve the final letter before official submission.</li>
          </ol>
        </div>
      ),
    },
    {
      id: "photo-upload",
      title: "3. How to Capture or Upload Complaint Photos",
      category: "photos",
      icon: Camera,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            Photographs provide crucial visual evidence that speeds up departmental verification and resolution:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
            <li>
              <strong>"Take Photo" (Camera Viewfinder):</strong> On mobile devices or computers with webcams, clicking <em>"Take Photo"</em> opens a live camera viewfinder. Align the civic issue within the frame and click <em>"Capture Photo"</em>. You can switch between front and rear cameras.
            </li>
            <li>
              <strong>"Upload Photo" (File Picker):</strong> Click <em>"Upload Photo"</em> to select existing pictures from your gallery or desktop files.
            </li>
            <li>
              <strong>Supported Formats:</strong> PNG, JPG, JPEG, and WEBP images up to 10 MB in file size.
            </li>
            <li>
              <strong>Photo-Only Mode:</strong> Even if you don't type a description, our Vision AI can inspect your uploaded photograph to identify the civic issue and auto-generate the complaint.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "ai-routing",
      title: "4. How AI Identifies Categories & Departments",
      category: "ai",
      icon: Bot,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            CivicRoute uses Gemini Vision and reasoning AI to eliminate civic bureaucracy and route issues accurately:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
            <li>
              <strong>Multimodal Inspection:</strong> The AI examines text and visual evidence together to detect problems such as potholes, garbage accumulation, water pipeline leaks, damaged streetlights, and drainage overflow.
            </li>
            <li>
              <strong>Department Classification:</strong> Complaints are classified automatically into municipal departments: <em>Water & Sanitation</em>, <em>Roads & Infrastructure</em>, <em>Sanitation</em>, <em>Electricity & Lighting</em>, and <em>Drainage & Public Works</em>.
            </li>
            <li>
              <strong>Severity & Priority Assessment:</strong> Issues are assigned a transparent priority based strictly on severity: <strong>Critical (Urgent)</strong> for acute public health or safety hazards, <strong>High</strong>, <strong>Medium</strong>, and <strong>Low</strong>.
            </li>
            <li>
              <strong>Redundancy & Fallback:</strong> If primary cloud AI endpoints experience high traffic or timeouts, CivicRoute seamlessly shifts to backup reasoning AI and deterministic keyword classifiers to ensure your complaint is always processed.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "tracking-status",
      title: "5. How to Track Complaint IDs & Statuses",
      category: "tracking",
      icon: MapPin,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            Every complaint receives an official unique tracking number (e.g. <code>CV-10482</code>):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
            <li>
              <strong>Submitted:</strong> Your complaint has been recorded and queued for the assigned departmental officer.
            </li>
            <li>
              <strong>Under Review:</strong> Municipal engineers or officers have reviewed the report and scheduled field verification.
            </li>
            <li>
              <strong>In Progress:</strong> Maintenance crews or service teams have been dispatched to resolve the reported issue.
            </li>
            <li>
              <strong>Resolved:</strong> Work has been completed and verified by the department.
            </li>
            <li>
              <strong>Tracking Search:</strong> Citizens can enter their Complaint ID on the tracking page to view audit logs, officer remarks, and print official letters.
            </li>
          </ul>
        </div>
      ),
    },
  ];

  // FAQs
  const faqs = [
    {
      question: "Is CivicRoute free for citizens to use?",
      answer:
        "Yes, CivicRoute is completely free for all citizens. It provides a direct public service bridge between residents and local government authorities.",
    },
    {
      question: "What happens if camera access is blocked by my browser?",
      answer:
        "If your browser denies camera permissions, CivicRoute displays a notification and provides a direct 'Upload Photo' option so you can select a photo from your device's photo library instead.",
    },
    {
      question: "Can I edit the generated complaint letter before submitting?",
      answer:
        "Yes. CivicRoute allows citizens to preview, rewrite, and edit both the problem description and the official formal complaint letter before confirming final submission.",
    },
    {
      question: "Who can see my personal phone number and email address?",
      answer:
        "Your contact details are protected under role-based privacy safeguards. They are visible only to verified departmental officers assigned to resolve your specific complaint and central administrators. Contact information is never exposed on public maps or unauthenticated APIs.",
    },
    {
      question: "How long does it typically take for a complaint to be resolved?",
      answer:
        "Resolution times depend on severity: Critical/Urgent hazards (e.g. fallen power lines, major water pipeline bursts) trigger rapid response within hours, while standard maintenance requests follow departmental 3 to 5 day service cycles.",
    },
    {
      question: "Can I file a complaint anonymously without registering?",
      answer:
        "You can file a complaint with just your email or as a guest; however, creating a citizen account allows you to track all your historical complaints, view real-time status updates, and manage notifications in one unified dashboard.",
    },
  ];

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
              onClick={() => setIsProblemModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
            >
              <Bug size={14} className="text-amber-600" />
              <span>Report a Problem</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-5 pt-8 pb-6 sm:px-8">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 p-7 sm:p-10 text-white shadow-xl shadow-blue-600/15">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <CircleHelp size={15} />
              Citizen Help & Knowledge Base
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
              How can we assist you today?
            </h1>

            <p className="mt-2.5 text-xs sm:text-sm text-blue-100 leading-relaxed">
              Explore step-by-step guides on filing civic complaints, photo analysis, status tracking, and contacting municipal support.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/report")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-md transition hover:bg-blue-50"
              >
                File a Civic Complaint
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => setIsProblemModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 backdrop-blur-sm"
              >
                <Bug size={14} />
                Report Platform Issue
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="relative mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left Column: Guides & FAQs */}
          <div className="space-y-8">
            {/* GUIDES SECTION */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Civic Platform User Guide
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step-by-step walkthrough of all citizen features
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {guideSections.map((guide) => {
                  const Icon = guide.icon;
                  return (
                    <div
                      key={guide.id}
                      className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Icon size={18} />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {guide.title}
                        </h3>
                      </div>
                      <div className="pl-12">{guide.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FREQUENTLY ASKED QUESTIONS */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs text-slate-500">
                  Quick answers to common citizen inquiries
                </p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = expandedFaq === index;
                  return (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFaq(isOpen ? null : index)
                        }
                        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50/70"
                      >
                        <span className="text-xs sm:text-sm font-bold text-slate-800 pr-4">
                          {faq.question}
                        </span>
                        <ChevronDown
                          size={17}
                          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Support Cards */}
          <div className="space-y-6">
            {/* CONTACT SUPPORT CARD */}
            <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-inner">
                <Mail size={22} />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Contact Citizen Support
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Need direct human assistance? Our municipal support coordinators are available via our official citizen support desk.
              </p>

              {/* Configurable Support Email Address Display */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Configurable Support Desk Email
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                    {supportEmail}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(supportEmail)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                    title="Copy support email address"
                  >
                    {copiedEmail ? (
                      <Check size={15} className="text-emerald-600" />
                    ) : (
                      <Copy size={15} />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <a
                  href={`mailto:${supportEmail}?subject=CivicRoute%20Citizen%20Inquiry`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  <Mail size={15} />
                  Send Email to Support
                </a>

                <button
                  type="button"
                  onClick={() => setIsProblemModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Bug size={15} className="text-amber-600" />
                  Report a Problem
                </button>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" />
                  <span>Hours: Mon - Fri, 9:00 AM to 5:00 PM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Verified Municipal Intake System</span>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS CARD */}
            <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Quick Shortcuts
              </h3>

              <div className="space-y-2 text-xs">
                <Link
                  to="/report"
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>File a New Complaint</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/complaints"
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>View My Complaints</span>
                  <span>→</span>
                </Link>

                <Link
                  to="/citizen/settings"
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>Account & Profile Settings</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* REPORT A PROBLEM MODAL */}
      {isProblemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Bug size={17} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  Report a Problem or Technical Bug
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProblemModalOpen(false);
                  setProblemSuccess(null);
                  setProblemError("");
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {problemSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    Problem Report Logged
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {problemSuccess.message}
                  </p>
                  <p className="mt-2 font-mono text-xs font-bold text-blue-600">
                    Reference ID: {problemSuccess.report_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProblemModalOpen(false);
                    setProblemSuccess(null);
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-blue-700"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportProblem} className="mt-5 space-y-4">
                {problemError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{problemError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Problem Category
                  </label>
                  <select
                    value={problemCategory}
                    onChange={(e) => setProblemCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Bug Report">Technical Bug / Application Glitch</option>
                    <option value="Camera Upload Issue">Camera or Photo Upload Failure</option>
                    <option value="AI Analysis Issue">Incorrect AI Department / Category</option>
                    <option value="Login Account Issue">Login or Password Problem</option>
                    <option value="Feature Feedback">Feature Request / Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Your Contact Email (Optional for updates)
                  </label>
                  <input
                    type="email"
                    value={problemEmail}
                    onChange={(e) => setProblemEmail(e.target.value)}
                    placeholder="e.g. you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Description of the Problem
                  </label>
                  <textarea
                    rows={4}
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Describe what occurred, what page you were on, and steps to reproduce..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProblemModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProblem}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {isSubmittingProblem ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

