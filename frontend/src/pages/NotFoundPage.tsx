import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada')
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo />
      <p className="mt-12 font-heading text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-muted-foreground">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'mt-8' })}>
        Volver al inicio
      </Link>
    </div>
  )
}
