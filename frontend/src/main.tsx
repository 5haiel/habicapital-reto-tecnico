import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'

import App from './App.tsx'
import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { setUnauthorizedHandler } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { clearSession } from '@/lib/session'

// A 401 in the middle of using the app means the session expired: drop all
// cached data and let the route guard send the user to /login.
setUnauthorizedHandler(() => {
  clearSession()
  toast.info('Tu sesión terminó. Inicia sesión de nuevo.', { id: 'session-expired' })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {/* Bottom, so a toast never covers a dialog's title; on phones it
            sits above the bottom tab bar. */}
        <Toaster position="bottom-center" offset={24} mobileOffset={{ bottom: 88 }} />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
