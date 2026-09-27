import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import AccountDetailPage from '@/pages/AccountDetailPage'
import AccountsPage from '@/pages/AccountsPage'
import ExpensesPage from '@/pages/ExpensesPage'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<AccountsPage />} />
        <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
