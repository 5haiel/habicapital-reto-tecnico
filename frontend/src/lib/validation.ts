// Client-side checks mirror the backend's (app/schemas.py) so people get
// instant feedback; the backend still validates everything on its own.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Escribe tu nombre.'
  if (name.trim().length > 120) return 'Máximo 120 caracteres.'
  return null
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Escribe tu correo.'
  if (!EMAIL_RE.test(email.trim())) return 'Ese correo no parece válido.'
  return null
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 8) return 'Usa al menos 8 caracteres.'
  if (password.length > 128) return 'Máximo 128 caracteres.'
  return null
}
