import {
  ArrowRight,
  BookCheck,
  Check,
  ChevronDown,
  Fingerprint,
  HandCoins,
  Lock,
  Repeat,
  Send,
  SplitSquareHorizontal,
  Tags,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { ProductPreview } from '@/components/brand/ProductPreview'
import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

const FEATURES = [
  { icon: Send, title: 'Envía al instante', text: 'A cualquier persona con cuenta, buscándola por nombre o correo.' },
  {
    icon: SplitSquareHorizontal,
    title: 'Divide gastos',
    text: 'En partes iguales o con montos a mano, y mira quién ya pagó.',
  },
  { icon: HandCoins, title: 'Cobra sin incomodar', text: 'Tu cobro le aparece a la otra persona listo para pagar.' },
  { icon: Tags, title: 'Historial con contexto', text: 'Cada movimiento con su concepto y etiqueta, no líneas sueltas.' },
]

const SCENARIOS = [
  { title: 'La cena', text: 'Pagaste el cumpleaños y ahora hay que cobrarle a 12 personas.' },
  { title: 'La mamá', text: 'Los hermanos le mandan plata cada mes, cada uno por su lado.' },
  { title: 'Los roommates', text: 'Arriendo, servicios y mercado divididos todos los meses.' },
  { title: 'La profesora', text: 'Cobra sus clases y ya no pierde horas cuadrando cuentas.' },
  { title: 'Los freelancers', text: 'Se pagan entre sí por trabajos pequeños, sin fricción.' },
]

const SAFETY = [
  {
    icon: BookCheck,
    title: 'Libro contable de doble entrada',
    text: 'Cada peso que sale de una cuenta entra a otra. La suma de todo el sistema siempre es cero.',
  },
  {
    icon: Repeat,
    title: 'Cada envío se procesa una sola vez',
    text: 'Si das doble clic o se cae la conexión y reintentas, la plata no se mueve dos veces.',
  },
  {
    icon: Lock,
    title: 'Saldos protegidos en simultáneo',
    text: 'Dos pagos al mismo tiempo nunca pueden dejar una cuenta en negativo.',
  },
  {
    icon: Fingerprint,
    title: 'Solo tú mueves tu plata',
    text: 'Tu sesión decide desde qué cuenta sale el dinero, nunca los datos que llegan del navegador.',
  },
]

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link to="/" aria-label="HabiCapital, inicio" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Logo />
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="Secciones">
          <a href="#como-funciona" className="transition-colors hover:text-foreground">Cómo funciona</a>
          <a href="#para-quien" className="transition-colors hover:text-foreground">Para quién</a>
          <a href="#seguridad" className="transition-colors hover:text-foreground">Seguridad</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-full border-2 border-primary px-5 font-semibold text-primary hover:bg-accent hover:text-primary',
            )}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className={cn(buttonVariants({ size: 'lg' }), 'hidden rounded-full px-5 font-semibold sm:inline-flex')}
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function LandingPage() {
  useDocumentTitle('')
  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />

      <section className="bg-hero text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-32">
          <div>
            <p className="eyebrow text-pink-200">Plata entre personas</p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-bold sm:text-6xl">
              Mover plata con los tuyos, fácil y seguro.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
              Envía, cobra y divide gastos con tu familia, tus amigos o tus roommates. Sin
              filas, sin papeleos y sin perder la cuenta de quién le debe a quién.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/registro" className={buttonVariants({ variant: 'inverse', size: 'xl' })}>
                Crear cuenta gratis
                <ArrowRight />
              </Link>
              <Link to="/login" className={buttonVariants({ variant: 'inverse-outline', size: 'xl' })}>
                Ya tengo cuenta
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
              {['Sin comisiones', '100% digital', 'Pagos simulados'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-brand-teal" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ProductPreview className="mt-6 lg:mt-0" />
        </div>
        <a
          href="#como-funciona"
          className="mx-auto flex w-fit items-center gap-3 pb-8 text-xs font-semibold tracking-[0.3em] text-white/80 uppercase transition-colors hover:text-white"
        >
          Conoce más <ChevronDown className="size-5" aria-hidden />
        </a>
      </section>

      <section id="como-funciona" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="eyebrow">Pensado para ti</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl leading-tight font-bold text-primary sm:text-[2.6rem]">
            Tu plata, con el contexto que el banco no ve.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Un extracto dice “transferencia $50.000”. Aquí dice que fue tu parte de la cena, quién
            ya pagó y quién falta.
          </p>
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col items-center">
                <span className="grid size-16 place-items-center rounded-full bg-background text-primary shadow-float" aria-hidden>
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 max-w-60 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="para-quien" className="scroll-mt-16 bg-canvas px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Para la vida real</p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-tight font-bold sm:text-4xl">
            Todos le debemos plata a alguien{' '}
            <span className="whitespace-nowrap text-primary">(y está bien).</span>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SCENARIOS.map(({ title, text }) => (
              <article key={title} className="overflow-hidden rounded-2xl border bg-card p-5 pt-6 shadow-card relative">
                <span className="absolute inset-x-0 top-0 h-1 bg-brand-pink" aria-hidden />
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguridad" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2 className="mt-4 text-3xl leading-tight font-bold sm:text-[2.6rem]">
              <span className="text-primary">No se pierde un peso.</span> Ni uno.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Es plata de personas reales. Por eso cada movimiento está protegido desde la base de datos.
            </p>
            <ul className="mt-10 divide-y border-y">
              {SAFETY.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-5 py-5">
                  <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div aria-hidden className="mx-auto w-full max-w-md rounded-3xl border bg-card p-6 shadow-float sm:p-8">
            <p className="eyebrow text-muted-foreground">Libro contable · Pago de la cena</p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex items-center justify-between">
                <span>Cuenta de Carla</span>
                <span className="amount font-semibold">− $ 85.000</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Cuenta de Ana</span>
                <span className="amount font-semibold text-positive">+ $ 85.000</span>
              </li>
            </ul>
            <div className="mt-6 flex items-center justify-between border-t pt-5">
              <span className="font-semibold">Suma del sistema</span>
              <span className="amount rounded-full bg-positive-soft px-3 py-1 text-sm font-bold text-positive">$ 0</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Si en algún momento la suma no diera cero, el sistema rechaza la operación completa: nunca
              queda un movimiento a medias.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-brand-gradient px-8 py-12 text-white shadow-float sm:px-12 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Crea tu cuenta en menos de un minuto.</h2>
            <p className="mt-2 text-white/80">Solo necesitas un nombre, un correo y una contraseña.</p>
          </div>
          <Link to="/registro" className={buttonVariants({ variant: 'inverse', size: 'xl' })}>
            Empezar ahora
            <ArrowRight />
          </Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo className="text-lg" />
          <p>Proyecto del reto técnico Practicantes 2027 · Los pagos son simulados.</p>
        </div>
      </footer>
    </div>
  )
}
