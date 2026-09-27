import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LogoMark } from '@/components/brand/Logo'
import { useSession } from '@/lib/session'

export function FullPageLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-canvas" role="status" aria-label="Cargando">
      <LogoMark className="size-10 animate-pulse text-primary" />
    </div>
  )
}

function SessionError() {
  return (
    <div className="grid min-h-svh place-items-center bg-canvas px-6 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-semibold">No pudimos conectarnos</h1>
        <p className="text-sm text-muted-foreground">
          Revisa tu conexión y recarga la página.
        </p>
      </div>
    </div>
  )
}

/** Only for signed-in users; everyone else goes to /login and comes back after. */
export function RequireAuth() {
  const { user, isLoading, isError } = useSession()
  const location = useLocation()
  if (isLoading) return <FullPageLoader />
  if (isError) return <SessionError />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Landing/login/register: a signed-in user has nothing to do here. */
export function PublicOnly() {
  const { user, isLoading } = useSession()
  if (isLoading) return <FullPageLoader />
  if (user) return <Navigate to="/inicio" replace />
  return <Outlet />
}
