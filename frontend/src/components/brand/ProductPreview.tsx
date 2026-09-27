import { ArrowDownLeft, Check, Send, SplitSquareHorizontal, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Decorative, static preview of the app (not real data) for the landing
 * hero and the auth side panel — floating white cards over the dark brand
 * gradient, the same visual language as habicapital.com's hero.
 */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('relative mx-auto w-full max-w-[20rem] select-none sm:max-w-sm', className)}>
      <div className="rounded-3xl bg-white p-6 pb-16 text-foreground shadow-float">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent font-heading text-xs font-bold text-accent-foreground">
            AG
          </span>
          <div>
            <p className="text-sm font-semibold">Hola, Ana</p>
            <p className="text-xs text-muted-foreground">Buenos días</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Saldo disponible</p>
        <p className="amount mt-1 text-[2rem] leading-none font-semibold">$ 1.660.000</p>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: Send, label: 'Enviar' },
            { icon: Wallet, label: 'Cargar' },
            { icon: SplitSquareHorizontal, label: 'Dividir' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="space-y-1.5">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent text-primary">
                <Icon className="size-[18px]" />
              </span>
              <span className="block text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-8 -left-4 w-72 rounded-2xl bg-white p-4 text-foreground shadow-float sm:-left-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-positive-soft text-positive">
            <ArrowDownLeft className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium whitespace-nowrap">Carla te pagó</p>
            <p className="text-xs whitespace-nowrap text-muted-foreground">Cena de cumpleaños</p>
          </div>
          <p className="amount text-sm font-semibold text-positive">+ $ 85.000</p>
        </div>
      </div>

      <div className="absolute -top-12 -right-3 w-48 rounded-2xl bg-white p-4 text-foreground shadow-float sm:-right-10 sm:w-52">
        <p className="text-xs text-muted-foreground">Internet del apartamento</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-semibold">2 de 3 pagaron</p>
          <span className="grid size-5 place-items-center rounded-full bg-primary text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
