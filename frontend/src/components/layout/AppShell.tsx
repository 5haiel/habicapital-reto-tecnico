import { ChevronDown, History, House, LogOut, UserRound, Users } from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { UserAvatar } from '@/components/brand/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout, useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/inicio', label: 'Inicio', icon: House },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/gastos', label: 'Gastos compartidos', shortLabel: 'Gastos', icon: Users },
]

function AccountMenu() {
  const { user } = useSession()
  const navigate = useNavigate()
  const logout = useLogout()
  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted"
        aria-label="Menú de tu cuenta"
      >
        <UserAvatar name={user.name} />
        <span className="hidden max-w-40 truncate text-sm font-medium md:block">{user.name}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/perfil')}>
          <UserRound />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  return (
    <div className="min-h-svh bg-canvas">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Link
            to="/inicio"
            className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="HabiCapital, ir al inicio"
          >
            <Logo />
          </Link>
          <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="Principal">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center px-3 text-sm font-medium transition-colors outline-none focus-visible:text-foreground',
                    'after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors',
                    isActive
                      ? 'text-foreground after:bg-primary'
                      : 'text-muted-foreground after:bg-transparent hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:px-6 md:pb-16">
        {/* Page chunks load inside the shell, so the header never flashes away. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Principal"
      >
        <div className="grid grid-cols-3">
          {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {shortLabel ?? label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
