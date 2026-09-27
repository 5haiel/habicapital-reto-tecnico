import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { FormAlert } from '@/components/forms/FormAlert'
import { FormField } from '@/components/forms/FormField'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError, errorMessage } from '@/lib/api'
import { useRegister } from '@/lib/session'
import { validateEmail, validateName, validateNewPassword } from '@/lib/validation'
import { AuthLayout } from '@/pages/auth/AuthLayout'

type Errors = { name?: string | null; email?: string | null; password?: string | null }

export default function RegisterPage() {
  useDocumentTitle('Crear cuenta')
  const navigate = useNavigate()
  const register = useRegister()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = {
      name: validateName(name),
      email: validateEmail(email),
      password: validateNewPassword(password),
    }
    setErrors(next)
    if (next.name || next.email || next.password) return
    register.mutate(
      { name: name.trim(), email: email.trim(), password },
      {
        onSuccess: (user) => {
          toast.success(`¡Bienvenido, ${user.name.split(' ')[0]}! Tu cuenta está lista.`)
          navigate('/inicio', { replace: true })
        },
        onError: (error) => {
          // A taken email belongs next to the email field, not in a banner.
          if (error instanceof ApiError && error.code === 'email_already_registered') {
            setErrors((prev) => ({ ...prev, email: error.message }))
          } else if (error instanceof ApiError && error.fields.includes('email')) {
            // Our regex is looser than the server's (e.g. reserved domains).
            setErrors((prev) => ({ ...prev, email: 'Usa un correo real: ese dominio no es válido.' }))
          }
        },
      },
    )
  }

  const shownOnField =
    register.error instanceof ApiError &&
    (register.error.code === 'email_already_registered' || register.error.fields.includes('email'))
  const bannerError = register.isError && !shownOnField ? errorMessage(register.error) : null

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza con saldo en cero. Cargar, enviar y dividir es gratis."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Nombre" error={errors.name}>
          <Input
            autoComplete="name"
            placeholder="Como te verán tus contactos"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors((prev) => ({ ...prev, name: null }))
            }}
            autoFocus
          />
        </FormField>
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
          />
        </FormField>
        <FormField label="Contraseña" hint="Mínimo 8 caracteres." error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setErrors((prev) => ({ ...prev, password: null }))
            }}
          />
        </FormField>
        <FormAlert message={bannerError} />
        <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
          {register.isPending ? 'Creando tu cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
