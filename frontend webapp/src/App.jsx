import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import TrustStrip from './components/TrustStrip'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import StatsSection from './components/StatsSection'
import ForFamilies from './components/ForFamilies'
import CTASection from './components/CTASection'
import Footer from './components/Footer'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Features />
      <StatsSection />
      <ForFamilies />
      <CTASection />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <div className="min-h-screen font-sans">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
