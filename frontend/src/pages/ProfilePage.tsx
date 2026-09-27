import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { UserAvatar } from '@/components/brand/UserAvatar'
import { FormAlert } from '@/components/forms/FormAlert'
import { FormField } from '@/components/forms/FormField'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { PageHeader, Panel } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError, api, errorMessage } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useLogout, useSession } from '@/lib/session'
import { validateEmail, validateName, validateNewPassword } from '@/lib/validation'
import type { User } from '@/types/api'

const memberSince = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null }>({})
  const update = useMutation({
    mutationFn: api.auth.updateProfile,
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.me, updated)
      client.invalidateQueries({ queryKey: queryKeys.account })
      toast.success('Guardamos tus datos')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'email_already_registered') {
        setErrors((prev) => ({ ...prev, email: error.message }))
      } else if (error instanceof ApiError && error.fields.includes('email')) {
        setErrors((prev) => ({ ...prev, email: 'Usa un correo real: ese dominio no es válido.' }))
      }
    },
  })

  const dirty = name.trim() !== user.name || email.trim().toLowerCase() !== user.email

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = { name: validateName(name), email: validateEmail(email) }
    setErrors(next)
    if (next.name || next.email) return
    update.mutate({
      ...(name.trim() !== user.name && { name: name.trim() }),
      ...(email.trim().toLowerCase() !== user.email && { email: email.trim() }),
    })
  }

  const shownOnField =
    update.error instanceof ApiError &&
    (update.error.code === 'email_already_registered' || update.error.fields.includes('email'))
  const bannerError = update.isError && !shownOnField ? errorMessage(update.error) : null

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField label="Nombre" hint="Así te ven las personas cuando les envías o cobras." error={errors.name}>
        <Input
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setErrors((prev) => ({ ...prev, name: null }))
          }}
        />
      </FormField>
      <FormField label="Correo" error={errors.email}>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setErrors((prev) => ({ ...prev, email: null }))
          }}
        />
      </FormField>
      <FormAlert message={bannerError} />
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!dirty || update.isPending}>
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<{ current?: string | null; next?: string | null }>({})
  const change = useMutation({
    mutationFn: api.auth.changePassword,
    onSuccess: () => {
      setCurrent('')
      setNext('')
      toast.success('Actualizamos tu contraseña')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'wrong_current_password') {
        setErrors({ current: error.message })
      }
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = {
      current: current ? null : 'Escribe tu contraseña actual.',
      next:
        validateNewPassword(next) ?? (next === current ? 'La nueva contraseña debe ser distinta.' : null),
    }
    setErrors(found)
    if (found.current || found.next) return
    change.mutate({ current_password: current, new_password: next })
  }

  const bannerError =
    change.isError && !(change.error instanceof ApiError && change.error.code === 'wrong_current_password')
      ? errorMessage(change.error)
      : null

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField label="Contraseña actual" error={errors.current}>
        <PasswordInput autoComplete="current-password" value={current} onChange={(e) => {
            setCurrent(e.target.value)
            setErrors((prev) => ({ ...prev, current: null }))
          }} />
      </FormField>
      <FormField label="Nueva contraseña" hint="Mínimo 8 caracteres." error={errors.next}>
        <PasswordInput autoComplete="new-password" value={next} onChange={(e) => {
            setNext(e.target.value)
            setErrors((prev) => ({ ...prev, next: null }))
          }} />
      </FormField>
      <FormAlert message={bannerError} />
      <div className="flex justify-end">
        <Button type="submit" size="lg" variant="outline" disabled={change.isPending}>
          {change.isPending ? 'Actualizando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}

export default function ProfilePage() {
  useDocumentTitle('Mi perfil')
  const { user } = useSession()
  const navigate = useNavigate()
  const logout = useLogout()
  if (!user) return null

  return (
    <>
      <PageHeader title="Mi perfil" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Panel className="h-fit">
          <div className="flex flex-col items-center py-2 text-center">
            <UserAvatar name={user.name} className="size-16 text-lg" />
            <p className="mt-4 font-heading text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Miembro desde {memberSince.format(new Date(user.created_at))}
            </p>
            <Button
              variant="ghost"
              className="mt-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
            >
              <LogOut />
              Cerrar sesión
            </Button>
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Datos personales">
            <div className="pt-3">
              <ProfileForm key={`${user.name}|${user.email}`} user={user} />
            </div>
          </Panel>
          <Panel title="Seguridad">
            <div className="pt-3">
              <PasswordForm />
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
