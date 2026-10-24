import { API_BASE_URL } from "../apiConfig";
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button } from '@heroui/react'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  UserRound,
  ArrowRight,
} from 'lucide-react'

function CitizenLogin() {
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    if (!loginId.trim() || !password) {
      setError('Please enter your email/phone and password.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/citizen/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login_id: loginId.trim(),
          password: password,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          localStorage.setItem('civicroute_citizen_token', data.token)
        }
        localStorage.setItem(
          'civicroute_logged_in_citizen',
          JSON.stringify(data.citizen)
        )
        navigate('/citizen/dashboard')
        return
      } else {
        const err = await response.json().catch(() => null)
        if (err?.detail) {
          setError(typeof err.detail === 'string' ? err.detail : 'Invalid credentials.')
          return
        }
      }
    } catch (apiErr) {
      console.warn('Backend login unavailable, checking local storage:', apiErr)
    }

    const savedCitizen = JSON.parse(
      localStorage.getItem('civicroute_citizen') || 'null'
    )

    if (!savedCitizen) {
      setError('No citizen account found. Please create an account first.')
      return
    }

    const enteredLogin = loginId.trim().toLowerCase()

    const emailMatches =
      savedCitizen.email?.toLowerCase() === enteredLogin

    const phoneMatches =
      savedCitizen.phone?.toLowerCase() === enteredLogin

    const passwordMatches =
      savedCitizen.password === password

    if ((!emailMatches && !phoneMatches) || !passwordMatches) {
      setError('Invalid email/phone or password.')
      return
    }

    localStorage.setItem(
      'civicroute_logged_in_citizen',
      JSON.stringify({
        name: savedCitizen.name,
        email: savedCitizen.email,
        phone: savedCitizen.phone,
        location: savedCitizen.location,
      })
    )

    navigate('/citizen/dashboard')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">

      {/* ---------- Background ---------- */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[600px] rounded-full bg-blue-100/50 blur-2xl" />

      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-200/50" />

      <div className="pointer-events-none absolute -bottom-72 -right-56 h-[650px] w-[850px] rounded-[50%] border border-blue-200/70" />

      <div className="pointer-events-none absolute -bottom-80 -right-64 h-[700px] w-[900px] rounded-[50%] border border-blue-100/80" />

      {/* ---------- Dot pattern ---------- */}

      <div className="pointer-events-none absolute right-12 top-[38%] hidden opacity-40 md:block">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 25 }).map((_, index) => (
            <span
              key={index}
              className="h-1 w-1 rounded-full bg-blue-300"
            />
          ))}
        </div>
      </div>

      {/* ---------- City illustration ---------- */}

      <div className="pointer-events-none absolute bottom-0 left-0 hidden h-72 w-[520px] opacity-25 lg:block">

        <svg
          viewBox="0 0 520 280"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          <rect
            x="20"
            y="115"
            width="42"
            height="165"
            fill="#93c5fd"
          />

          <rect
            x="72"
            y="155"
            width="55"
            height="125"
            fill="#bfdbfe"
          />

          <rect
            x="138"
            y="95"
            width="55"
            height="185"
            fill="#93c5fd"
          />

          <rect
            x="204"
            y="140"
            width="48"
            height="140"
            fill="#bfdbfe"
          />

          <rect
            x="263"
            y="80"
            width="60"
            height="200"
            fill="#93c5fd"
          />

          <rect
            x="335"
            y="125"
            width="48"
            height="155"
            fill="#bfdbfe"
          />

          <rect
            x="395"
            y="105"
            width="55"
            height="175"
            fill="#93c5fd"
          />

          <rect
            x="458"
            y="150"
            width="42"
            height="130"
            fill="#bfdbfe"
          />

          <polygon
            points="263,80 293,48 323,80"
            fill="#93c5fd"
          />

          <polygon
            points="20,115 41,90 62,115"
            fill="#93c5fd"
          />

          <path
            d="M0 235 Q130 175 260 235 Q390 295 520 235"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="8"
          />

          <path
            d="M0 250 Q130 190 260 250 Q390 310 520 250"
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="4"
          />

          <path
            d="M0 265 Q120 245 250 265 Q380 285 520 260 L520 280 L0 280 Z"
            fill="#bfdbfe"
          />
        </svg>

      </div>

      {/* ---------- Navigation ---------- */}

      <nav className="relative z-20 px-8 py-7 md:px-12">

        <Link
          to="/"
          className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 transition hover:text-blue-600"
        >
          <ArrowLeft size={21} />
          Back to CivicRoute
        </Link>

      </nav>

      {/* ---------- Main ---------- */}

      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 pb-10">

        <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_550px_1fr]">

          {/* ---------- Left message ---------- */}

          <div className="hidden lg:block">

            <p className="text-2xl font-light leading-[1.35] text-slate-400">
              Better
              <br />
              Communities
              <br />
              Together
            </p>

            <div className="mt-5 h-1 w-10 rounded-full bg-blue-500" />

            <p className="mt-5 max-w-xs text-base leading-7 text-blue-900/40">
              Report. Track. Create
              <br />
              a cleaner, safer tomorrow.
            </p>

          </div>

          {/* ---------- Login Card ---------- */}

          <div className="rounded-[22px] border border-white/80 bg-white/95 p-8 shadow-[0_25px_80px_rgba(59,130,246,0.14)] backdrop-blur-xl sm:p-9">

            {/* Icon */}

            <div className="flex justify-center">

              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-600">

                <UserRound
                  size={42}
                  strokeWidth={1.8}
                />

              </div>

            </div>

            {/* Heading */}

            <div className="mt-5 text-center">

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Welcome Back
              </h1>

              <p className="mt-2 text-base text-slate-500">
                Sign in to your Citizen Portal
              </p>

            </div>

            {/* ---------- Form ---------- */}

            <div className="mt-8 flex flex-col gap-5">

              {/* Email / Phone */}

              <Input
                placeholder="Enter email or phone"
                type="text"
                variant="bordered"
                radius="lg"
                size="lg"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                classNames={{
                  inputWrapper:
                    "h-14 w-full border-2 border-slate-500 bg-white shadow-sm",
                  input:
                    "text-slate-700 text-base",
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
                placeholder="Enter password"
                type="password"
                variant="bordered"
                radius="lg"
                size="lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                classNames={{
                  inputWrapper:
                    "h-14 w-full border-2 border-slate-500 bg-white shadow-sm",
                  input:
                    "text-slate-700 text-base",
                }}
                startContent={
                  <Lock
                    size={20}
                    className="text-slate-500"
                  />
                }
                endContent={
                  <Eye
                    size={20}
                    className="cursor-pointer text-slate-500"
                  />
                }
              />

              {/* Error */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Forgot password */}

              <div className="flex justify-end">

                <Link
                  to="/forgot-password?role=citizen"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
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
                className="w-full bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                endContent={<ArrowRight size={19} />}
              >
                Sign In
              </Button>

            </div>

            {/* ---------- Register ---------- */}

            <div className="mt-8 flex items-center gap-4">

              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-sm text-slate-400">
                Don't have an account?
              </span>

              <div className="h-px flex-1 bg-slate-200" />

            </div>

            <div className="mt-5 text-center">

              <Link
                to="/citizen/register"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Create a Citizen Account
              </Link>

            </div>

          </div>

          {/* ---------- Right message ---------- */}

          <div className="hidden text-right lg:block">

            <p className="text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Cleaner Cities
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Safer Communities
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Stronger Tomorrow
            </p>

          </div>

        </div>

      </main>

      {/* ---------- Bottom ---------- */}

      <div className="relative z-20 pb-7 text-center text-sm text-slate-400">

        Are you an authority officer?{' '}

        <Link
          to="/authority/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Authority Login
        </Link>

      </div>

    </div>
  )
}

export default CitizenLogin