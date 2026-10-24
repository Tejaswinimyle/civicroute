import { API_BASE_URL } from "../apiConfig";
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button } from '@heroui/react'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  ArrowRight,
} from 'lucide-react'

function CitizenRegister() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setError('')

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !location.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/citizen/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          location: location.trim(),
          password,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          localStorage.setItem('civicroute_citizen_token', data.token)
        }
        localStorage.setItem('civicroute_citizen', JSON.stringify(data.citizen))
        localStorage.setItem('civicroute_logged_in_citizen', JSON.stringify(data.citizen))
        navigate('/citizen/login')
        return
      } else {
        const err = await response.json().catch(() => null)
        if (err?.detail) {
          setError(typeof err.detail === 'string' ? err.detail : 'Registration failed.')
          return
        }
      }
    } catch (apiErr) {
      console.warn('Backend unavailable, saving locally:', apiErr)
    }

    const citizen = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      location: location.trim(),
      password,
    }

    localStorage.setItem(
      'civicroute_citizen',
      JSON.stringify(citizen)
    )

    navigate('/citizen/login')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50">

      {/* ---------- Background ---------- */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[600px] rounded-full bg-blue-100/50 blur-2xl" />

      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-200/50" />

      <div className="pointer-events-none absolute -bottom-72 -right-56 h-[650px] w-[850px] rounded-[50%] border border-blue-200/70" />

      <div className="pointer-events-none absolute -bottom-80 -right-64 h-[700px] w-[900px] rounded-[50%] border border-blue-100/80" />

      {/* ---------- Dot Pattern ---------- */}

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

      {/* ---------- City Illustration ---------- */}

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

      <main className="relative z-10 flex items-center justify-center px-6 pb-12">

        <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_550px_1fr]">

          {/* ---------- Left Message ---------- */}

          <div className="hidden lg:block">

            <p className="text-2xl font-light leading-[1.35] text-slate-400">
              Your Voice
              <br />
              Your City
              <br />
              Your Community
            </p>

            <div className="mt-5 h-1 w-10 rounded-full bg-blue-500" />

            <p className="mt-5 max-w-xs text-base leading-7 text-blue-900/40">
              Join CivicRoute and help
              <br />
              make your community better.
            </p>

          </div>

          {/* ---------- Register Card ---------- */}

          <div className="rounded-[22px] border border-white/80 bg-white/95 p-8 shadow-[0_25px_80px_rgba(59,130,246,0.14)] backdrop-blur-xl sm:p-9">

            {/* Icon */}

            <div className="flex justify-center">

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">

                <User
                  size={38}
                  strokeWidth={1.8}
                />

              </div>

            </div>

            {/* Heading */}

            <div className="mt-4 text-center">

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Create Account
              </h1>

              <p className="mt-2 text-base text-slate-500">
                Join your Citizen Portal
              </p>

            </div>

            {/* ---------- Form ---------- */}

            <div className="mt-7 flex flex-col gap-4">

              {/* Name */}

              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                type="text"
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={{
                  inputWrapper:
                    "h-14 w-full border-2 border-slate-500 bg-white shadow-sm",
                  input:
                    "text-slate-700 text-base",
                }}
                startContent={
                  <User
                    size={20}
                    className="text-slate-500"
                  />
                }
              />

              {/* Email */}

              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                variant="bordered"
                radius="lg"
                size="lg"
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

              {/* Phone */}

              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                type="tel"
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={{
                  inputWrapper:
                    "h-14 w-full border-2 border-slate-500 bg-white shadow-sm",
                  input:
                    "text-slate-700 text-base",
                }}
                startContent={
                  <Phone
                    size={20}
                    className="text-slate-500"
                  />
                }
              />

              {/* Location */}

              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your city / area"
                type="text"
                variant="bordered"
                radius="lg"
                size="lg"
                classNames={{
                  inputWrapper:
                    "h-14 w-full border-2 border-slate-500 bg-white shadow-sm",
                  input:
                    "text-slate-700 text-base",
                }}
                startContent={
                  <MapPin
                    size={20}
                    className="text-slate-500"
                  />
                }
              />

              {/* Password */}

              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                type="password"
                variant="bordered"
                radius="lg"
                size="lg"
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
              />

              {/* Confirm Password */}

              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                type="password"
                variant="bordered"
                radius="lg"
                size="lg"
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
              />

              {/* Error */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Create Account Button */}

              <Button
                color="primary"
                size="lg"
                radius="lg"
                onPress={handleRegister}
                className="mt-2 w-full bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                endContent={
                  <ArrowRight size={19} />
                }
              >
                Create Account
              </Button>

            </div>

            {/* ---------- Login ---------- */}

            <div className="mt-7 flex items-center gap-4">

              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-sm text-slate-400">
                Already have an account?
              </span>

              <div className="h-px flex-1 bg-slate-200" />

            </div>

            <div className="mt-4 text-center">

              <Link
                to="/citizen/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign In to Citizen Portal
              </Link>

            </div>

          </div>

          {/* ---------- Right Message ---------- */}

          <div className="hidden text-right lg:block">

            <p className="text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Report Issues
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Track Progress
            </p>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-blue-900/30">
              Improve Communities
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

export default CitizenRegister