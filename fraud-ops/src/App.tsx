import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import AnalyzeTransaction from './pages/AnalyzeTransaction'
import SystemStatusPage from './pages/SystemStatus'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analyze" element={<AnalyzeTransaction />} />
          <Route path="/system" element={<SystemStatusPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
