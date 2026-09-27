import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { FullPageLoader, PublicOnly, RequireAuth } from '@/components/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import LandingPage from '@/pages/LandingPage'

// The landing is what first-time visitors hit, so it ships in the main
// bundle; everything behind login is split out per route.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/inicio" element={<HomePage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route path="/gastos" element={<ExpensesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
