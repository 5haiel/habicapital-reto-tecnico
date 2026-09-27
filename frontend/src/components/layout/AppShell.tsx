import { ArrowLeftRight, Users, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Cuentas', icon: Wallet },
  { to: '/expenses', label: 'Gastos grupales', icon: Users },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <ArrowLeftRight className="size-4 text-primary" aria-hidden />
            <span>HabiCapital</span>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
