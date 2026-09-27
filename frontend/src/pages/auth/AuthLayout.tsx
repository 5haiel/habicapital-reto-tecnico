import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { ProductPreview } from '@/components/brand/ProductPreview'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link to="/" className="w-fit rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo />
        </Link>
        <main className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[1.75rem] leading-tight font-bold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>
          </div>
        </main>
        <p className="text-xs text-muted-foreground">
          Proyecto del reto técnico HabiCapital · Los pagos son simulados.
        </p>
      </div>

      <aside className="relative m-3 hidden overflow-hidden rounded-[1.75rem] bg-hero lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="max-w-md">
          <p className="eyebrow text-pink-200">Plata entre personas</p>
          <p className="mt-4 font-heading text-[2.1rem] leading-[1.15] font-bold text-white">
            Divide, cobra y envía sin perder un peso.
          </p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-white/75">
            La cena del cumpleaños, el arriendo con tus roommates o la plata para la
            mamá: cada movimiento con su contexto.
          </p>
        </div>
        <ProductPreview className="my-16" />
        <p className="text-xs text-white/55">Cada peso queda registrado en un libro contable de doble entrada.</p>
      </aside>
    </div>
  )
}
