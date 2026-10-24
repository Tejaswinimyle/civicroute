import os

ROOT_DIR = r"c:\Users\hp\OneDrive\Desktop\civicroute\civicroute\src\pages"

def patch_citizen_register():
    path = os.path.join(ROOT_DIR, "CitizenRegister.jsx")
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    target = """  const handleRegister = () => {
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
  }"""

    replacement = """  const handleRegister = async () => {
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
      const response = await fetch('http://127.0.0.1:8000/auth/citizen/register', {
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
  }"""

    # Normalize newlines
    normalized_code = code.replace("\r\n", "\n")
    normalized_target = target.replace("\r\n", "\n")
    assert normalized_target in normalized_code, "Target not found in CitizenRegister.jsx"
    updated = normalized_code.replace(normalized_target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("Patched CitizenRegister.jsx")


def patch_citizen_login():
    path = os.path.join(ROOT_DIR, "CitizenLogin.jsx")
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    target = """  const handleLogin = () => {
    setError('')

    if (!loginId.trim() || !password) {
      setError('Please enter your email/phone and password.')
      return
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
  }"""

    replacement = """  const handleLogin = async () => {
    setError('')

    if (!loginId.trim() || !password) {
      setError('Please enter your email/phone and password.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/citizen/login', {
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
  }"""

    normalized_code = code.replace("\r\n", "\n")
    normalized_target = target.replace("\r\n", "\n")
    assert normalized_target in normalized_code, "Target not found in CitizenLogin.jsx"
    updated = normalized_code.replace(normalized_target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("Patched CitizenLogin.jsx")


def patch_authority_login():
    path = os.path.join(ROOT_DIR, "AuthorityLogin.jsx")
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    target = """  const handleLogin = () => {
    setError('')

    const id = officerId.trim().toLowerCase()
    const pass = password.trim()"""

    replacement = """  const handleLogin = async () => {
    setError('')

    const id = officerId.trim().toLowerCase()
    const pass = password.trim()

    if (!id || !pass) {
      setError('Please enter your officer ID and password.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/authority/login', {
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
    }"""

    normalized_code = code.replace("\r\n", "\n")
    normalized_target = target.replace("\r\n", "\n")
    assert normalized_target in normalized_code, "Target not found in AuthorityLogin.jsx"
    updated = normalized_code.replace(normalized_target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(updated)
    print("Patched AuthorityLogin.jsx")

if __name__ == "__main__":
    patch_citizen_register()
    patch_citizen_login()
    patch_authority_login()

