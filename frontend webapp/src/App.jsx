import Navbar from './components/Navbar'
import Hero from './components/Hero'
import TrustStrip from './components/TrustStrip'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import StatsSection from './components/StatsSection'
import ForFamilies from './components/ForFamilies'
import CTASection from './components/CTASection'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Features />
      <StatsSection />
      <ForFamilies />
      <CTASection />
      <Footer />
    </div>
  )
}
