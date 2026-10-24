import { API_BASE_URL } from "../apiConfig";
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button } from '@heroui/react'
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

function AuthorityLogin() {
  const navigate = useNavigate()

  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    setError('')

    const id = officerId.trim().toLowerCase()
    const pass = password.trim()

    if (!id || !pass) {
      setError('Please enter your officer ID and password.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/authority/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_id: id,
          password: pass,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          localStorage.setItem('civicroute_authority_token', data.token)
        }
        localStorage.setItem(
          'civicroute_authority',
          JSON.stringify(data.authority)
        )
        navigate('/authority/dashboard')
        return
      } else {
        const err = await response.json().catch(() => null)
        if (err?.detail) {
          setError(typeof err.detail === 'string' ? err.detail : 'Invalid credentials.')
          return
        }
      }
    } catch (apiErr) {
      console.warn('Backend authority login failed, checking fallback accounts:', apiErr)
    }

    const accounts = {
      water001: {
        password: 'water123',
        name: 'Water Officer',
        department: 'Water & Sanitation',
        role: 'department_officer',
      },

      roads001: {
        password: 'roads123',
        name: 'Roads Officer',
        department: 'Roads & Infrastructure',
        role: 'department_officer',
      },

      san001: {
        password: 'san123',
        name: 'Sanitation Officer',
        department: 'Sanitation',
        role: 'department_officer',
      },

      admin001: {
        password: 'admin123',
        name: 'Central Administrator',
        department: 'Central Administration',
        role: 'admin',
      },
      electricity001: {
  password: "electricity123",
  name: "Electricity Officer",
  department: "Electricity & Lighting",
  role: "department_officer",
},
drainage001: {
  password: 'drainage123',
  name: 'Drainage Officer',
  department: 'Drainage & Public Works',
  role: 'department_officer',
},
    }

    const account = accounts[id]

    if (!account || account.password !== pass) {
      setError('Invalid officer ID or password.')
      return
    }

    localStorage.setItem(
      'civicroute_authority',
      JSON.stringify({
        officerId: id,
        name: account.name,
        department: account.department,
        role: account.role,
      })
    )

    navigate('/authority/dashboard')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-slate-50">

      {/* ---------- Background ---------- */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[600px] rounded-full bg-indigo-100/50 blur-2xl" />

      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-200/50" />

      <div className="pointer-events-none absolute -bottom-72 -right-56 h-[650px] w-[850px] rounded-[50%] border border-indigo-200/70" />

      <div className="pointer-events-none absolute -bottom-80 -right-64 h-[700px] w-[900px] rounded-[50%] border border-indigo-100/80" />

      {/* ---------- Dot Pattern ---------- */}

      <div className="pointer-events-none absolute right-12 top-[38%] hidden opacity-40 md:block">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 25 }).map((_, index) => (
            <span
              key={index}
              className="h-1 w-1 rounded-full bg-indigo-300"
            />
          ))}
        </div>
      </div>

      {/* ---------- City Illustration ---------- */}

      <div className="pointer-events-none absolute bottom-0 left-0 hidden h-72 w-[520px] opacity-25 lg:block">
        <svg
          viewBox="0 0 520 280"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          <rect x="20" y="115" width="42" height="165" fill="#a5b4fc" />
          <rect x="72" y="155" width="55" height="125" fill="#c7d2fe" />
          <rect x="138" y="95" width="55" height="185" fill="#a5b4fc" />
          <rect x="204" y="140" width="48" height="140" fill="#c7d2fe" />
          <rect x="263" y="80" width="60" height="200" fill="#a5b4fc" />
          <rect x="335" y="125" width="48" height="155" fill="#c7d2fe" />
          <rect x="395" y="105" width="55" height="175" fill="#a5b4fc" />
          <rect x="458" y="150" width="42" height="130" fill="#c7d2fe" />

          <polygon points="263,80 293,48 323,80" fill="#a5b4fc" />
          <polygon points="20,115 41,90 62,115" fill="#a5b4fc" />

          <path
            d="M0 235 Q130 175 260 235 Q390 295 520 235"
            fill="none"
            stroke="#818cf8"
            strokeWidth="8"
          />

          <path
            d="M0 250 Q130 190 260 250 Q390 310 520 250"
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="4"
          />

          <path
            d="M0 265 Q120 245 250 265 Q380 285 520 260 L520 280 L0 280 Z"
            fill="#c7d2fe"
          />
        </svg>
      </div>

      {/* ---------- Navigation ---------- */}

      <nav className="relative z-20 px-8 py-7 md:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 transition hover:text-indigo-600"
        >
          <ArrowLeft size={21} />
          Back to CivicRoute
        </Link>
      </nav>

      {/* ---------- Main ---------- */}

      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 pb-10">

        <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_550px_1fr]">

          {/* ---------- Left Message ---------- */}

          <div className="hidden lg:block">
            <p className="text-2xl font-light leading-[1.35] text-slate-400">
              Serve
              <br />
              Respond
              <br />
              Improve
            </p>

            <div className="mt-5 h-1 w-10 rounded-full bg-indigo-500" />

            <p className="mt-5 max-w-xs text-base leading-7 text-indigo-900/40">
              Empowering civic authorities
              <br />
              to build better communities.
            </p>
          </div>

          {/* ---------- Login Card ---------- */}

          <div className="rounded-[22px] border border-white/80 bg-white/95 p-8 shadow-[0_25px_80px_rgba(79,70,229,0.14)] backdrop-blur-xl sm:p-9">

            {/* Icon */}

            <div className="flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ShieldCheck
                  size={44}
                  strokeWidth={1.8}
                />
              </div>
            </div>

            {/* Heading */}

            <div className="mt-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                Authorized Personnel Only
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Authority Portal
              </h1>

              <p className="mt-2 text-base text-slate-500">
                Sign in to manage civic complaints
              </p>
            </div>

            {/* ---------- Form ---------- */}

            <div className="mt-8 flex flex-col gap-5">

              {/* Officer ID */}

              <Input
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="Enter officer ID or email"
                type="text"
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={{
                  inputWrapper:
                    'h-14 w-full border-2 border-slate-500 bg-white shadow-sm',
                  input:
                    'text-slate-700 text-base',
                }}
                startContent={
                  <Mail
                    size={20}
                    className="text-slate-500"
                  />
                }
              />

              {/* Password */}

              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={{
                  inputWrapper:
                    'h-14 w-full border-2 border-slate-500 bg-white shadow-sm',
                  input:
                    'text-slate-700 text-base',
                }}
                startContent={
                  <Lock
                    size={20}
                    className="text-slate-500"
                  />
                }
                endContent={
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="cursor-pointer text-slate-500"
                  >
                    <Eye size={20} />
                  </button>
                }
              />

              {/* Error */}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              {/* Forgot Password */}

              <div className="flex justify-end">
                <Link
                  to="/forgot-password?role=authority"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In */}

              <Button
                color="primary"
                size="lg"
                radius="lg"
                onPress={handleLogin}
                className="w-full bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700"
                endContent={
                  <ArrowRight size={19} />
                }
              >
                Authority Sign In
              </Button>

            </div>

            {/* ---------- Demo Accounts ---------- */}

           {/* ---------- Demo Accounts ---------- */}

<div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-4">

  <p className="text-center text-xs font-semibold text-indigo-700">
    Demo Authority Accounts
  </p>

  <div className="mt-3 space-y-1 text-center text-[11px] leading-5 text-indigo-600/80">

    <p>
      💧 Water: <b>water001 / water123</b>
    </p>

    <p>
      🛣️ Roads: <b>roads001 / roads123</b>
    </p>

    <p>
      🗑️ Sanitation: <b>san001 / san123</b>
    </p>

    <p>
      ⚡ Electricity: <b>electricity001 / electricity123</b>
    </p>
<p>
  🚰 Drainage: <b>drainage001 / drainage123</b>
</p>
    <p>
      🛡️ Admin: <b>admin001 / admin123</b>
    </p>

  </div>

</div>
            {/* ---------- Security Note ---------- */}

            <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-center">
              <p className="text-xs leading-5 text-indigo-700/70">
                This portal is restricted to authorized
                civic administration personnel.
              </p>
            </div>

          </div>

          {/* ---------- Right Message ---------- */}

          <div className="hidden text-right lg:block">

            <p className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-900/30">
              Monitor Complaints
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-indigo-900/30">
              Assign Departments
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-indigo-900/30">
              Resolve Issues
            </p>

          </div>

        </div>

      </main>

      {/* ---------- Bottom ---------- */}

      <div className="relative z-20 pb-7 text-center text-sm text-slate-400">
        Are you a citizen?{' '}

        <Link
          to="/citizen/login"
          className="font-semibold text-indigo-600 hover:underline"
        >
          Citizen Login
        </Link>
      </div>

    </div>
  )
}

export default AuthorityLogin