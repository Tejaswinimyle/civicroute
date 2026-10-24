import { Routes, Route, Link } from "react-router-dom";
import { Button } from "@heroui/react";

import {
  UserRound,
  Landmark,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileText,
  MapPin,
} from "lucide-react";

import CitizenLogin from "./pages/CitizenLogin";
import CitizenRegister from "./pages/CitizenRegister";
import CitizenDashboard from "./pages/CitizenDashboard";
import AuthorityLogin from "./pages/AuthorityLogin";
import ReportComplaint from "./pages/ReportComplaint";
import MyComplaints from "./pages/MyComplaints";
import ComplaintTracking from "./pages/ComplaintTracking";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CitizenSettings from "./pages/CitizenSettings";
import HelpSupport from "./pages/HelpSupport";

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Background shapes */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 -top-24 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-60 -right-20 h-[550px] w-[550px] rounded-full bg-blue-100/60 blur-3xl" />

      {/* Curved lines */}

      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[500px] w-[750px] rounded-[50%] border border-blue-200/50" />

      <div className="pointer-events-none absolute -bottom-60 -left-40 h-[550px] w-[820px] rounded-[50%] border border-blue-100/60" />

      {/* Top right circle */}

      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-100/60" />

      {/* Dot grid */}

      <div className="pointer-events-none absolute right-12 top-1/3 hidden opacity-40 md:block">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 25 }).map((_, index) => (
            <span
              key={index}
              className="h-1 w-1 rounded-full bg-blue-300"
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-20 left-16 hidden opacity-30 lg:block">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="h-1 w-1 rounded-full bg-blue-300"
            />
          ))}
        </div>
      </div>

      {/* Navbar */}

      <nav className="relative z-20 border-b border-white/70 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link to="/" className="group">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              Civic<span className="text-blue-600">Route</span>
            </div>

            <p className="text-[11px] font-medium tracking-wide text-slate-400">
              AI-POWERED CIVIC PLATFORM
            </p>
          </Link>

          <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
            <ShieldCheck size={16} />
            Trusted civic reporting
          </div>
        </div>
      </nav>

      {/* Main Hero */}

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-10 pt-10 md:px-10 md:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* LEFT SIDE */}

          <div>
            {/* Badge */}

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-sm font-medium text-blue-600 shadow-sm backdrop-blur">
              <Sparkles size={16} />
              AI-Powered Civic Intelligence
            </div>

            {/* Heading */}

            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-6xl lg:text-6xl">
              Tell Us the Problem.
              <br />
              <span className="text-blue-600">
                We'll Find the Right Department.
              </span>
            </h1>

            {/* Description */}

            <p className="mt-6 max-w-xl text-lg leading-7 text-slate-500">
              Report civic issues in simple language. CivicRoute uses AI
              to understand your problem, identify the right department,
              and help you track it until resolution.
            </p>

            {/* Features */}

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <FileText size={17} className="text-blue-500" />
                Easy reporting
              </div>

              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-blue-500" />
                AI routing
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={17} className="text-blue-500" />
                Track complaints
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}

          <div className="relative">
            {/* Soft glow */}

            <div className="absolute inset-8 rounded-[40px] bg-blue-100/50 blur-3xl" />

            <div className="relative space-y-4">
              {/* Citizen Portal */}

              <Link
                to="/citizen/login"
                className="group block"
              >
                <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(59,130,246,0.10)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(59,130,246,0.16)]">
                  <div className="flex items-start gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <UserRound
                        size={28}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">
                          Citizen Portal
                        </h2>

                        <ArrowRight
                          size={20}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                        />
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Report problems, submit complaints, and track
                        their progress from anywhere.
                      </p>
                    </div>
                  </div>

                  <Button
                    color="primary"
                    radius="lg"
                    className="mt-5 w-full font-semibold shadow-md shadow-blue-500/20"
                  >
                    Continue as Citizen
                  </Button>
                </div>
              </Link>

              {/* Authority Portal */}

              <Link
                to="/authority/login"
                className="group block"
              >
                <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(59,130,246,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(59,130,246,0.12)]">
                  <div className="flex items-start gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <Landmark
                        size={28}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">
                          Authority Portal
                        </h2>

                        <ArrowRight
                          size={20}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
                        />
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Manage assigned complaints, update statuses,
                        and monitor issues in your department.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="bordered"
                    radius="lg"
                    className="mt-5 w-full border-indigo-200 font-semibold text-indigo-600 hover:bg-indigo-50"
                  >
                    Continue as Authority
                  </Button>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}

        <div className="mt-10 border-t border-slate-200/70 pt-5">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-400 md:flex-row">
            <p>
              Making civic reporting simpler, smarter, and more
              transparent.
            </p>

            <p>
              Water • Roads • Sanitation • Drainage
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Home */}
      <Route
        path="/"
        element={<Home />}
      />

      {/* Citizen */}
      <Route
        path="/citizen/login"
        element={<CitizenLogin />}
      />

      <Route
        path="/citizen/register"
        element={<CitizenRegister />}
      />

      <Route
        path="/citizen/dashboard"
        element={<CitizenDashboard />}
      />

      {/* Authority */}
      <Route
        path="/authority/login"
        element={<AuthorityLogin />}
      />
      <Route
  path="/authority/dashboard"
  element={<AuthorityDashboard />}
/>

      {/* AI Complaint */}
      <Route
        path="/report"
        element={<ReportComplaint />}
      />
      {/* My Complaints */}
      <Route
  path="/complaints"
  element={<MyComplaints />}
/>
<Route
  path="/complaints/:id"
  element={<ComplaintTracking />}
/>
      {/* Password Reset */}
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Citizen Settings & Support */}
      <Route
        path="/citizen/settings"
        element={<CitizenSettings />}
      />
      <Route
        path="/citizen/help"
        element={<HelpSupport />}
      />
      <Route
        path="/help"
        element={<HelpSupport />}
      />

    </Routes>
  );
}

export default App;