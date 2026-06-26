// Root router — defines all client-side routes.
// frontend/vercel.json rewrites every path to /index.html so React Router handles navigation;
// without that rewrite, any direct URL or page refresh would 404 on Vercel.
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Reunion from './pages/Reunion'
import Photos from './pages/Photos'
import Program from './pages/Program'
import Links from './pages/Links'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:year" element={<Reunion />} />
        <Route path="/:year/photos" element={<Photos />} />
        <Route path="/:year/program" element={<Program />} />
        <Route path="/:year/links" element={<Links />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
