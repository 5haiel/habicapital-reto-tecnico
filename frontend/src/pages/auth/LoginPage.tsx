import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { FormAlert } from '@/components/forms/FormAlert'
import { FormField } from '@/components/forms/FormField'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { errorMessage } from '@/lib/api'
import { useLogin } from '@/lib/session'
import { validateEmail } from '@/lib/validation'
import { AuthLayout } from '@/pages/auth/AuthLayout'

const DEMO = { email: 'ana@demo.co', password: 'habicapital123' }

export default function LoginPage() {
  useDocumentTitle('Iniciar sesión')
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/inicio'
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({})

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = {
      email: validateEmail(email),
      password: password ? null : 'Escribe tu contraseña.',
    }
    setErrors(next)
    if (next.email || next.password) return
    login.mutate(
      { email: email.trim(), password },
      { onSuccess: () => navigate(from, { replace: true }) },
    )
  }

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para ver tu saldo y tus movimientos."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Correo" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors((prev) => ({ ...prev, email: null }))
            }}
            autoFocus
          />
        </FormField>
        <FormField label="Contraseña" error={errors.password}>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((prev) => ({ ...prev, password: null }))
            }}
          />
        </FormField>
        <FormAlert message={login.isError ? errorMessage(login.error) : null} />
        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium">¿Revisando la demo?</p>
        <p className="mt-0.5 text-muted-foreground">
          Usa <span className="font-medium text-foreground">{DEMO.email}</span> ·{' '}
          <span className="font-medium text-foreground">{DEMO.password}</span>
        </p>
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto px-0"
          onClick={() => {
            setEmail(DEMO.email)
            setPassword(DEMO.password)
            setErrors({})
          }}
        >
          Completar con la cuenta demo
        </Button>
      </div>
    </AuthLayout>
  )
}
