import { useState } from 'react';
import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import MissionVision from '../components/landing/MissionVision';
import ServicesGrid from '../components/landing/ServicesGrid';
import HistoryTimeline from '../components/landing/HistoryTimeline';
import LandingFooter from '../components/landing/LandingFooter';
import LoginModal from '../components/landing/LoginModal';

export default function Landing() {
  const [loginOpen, setLoginOpen] = useState(false);

  const handleOpenLogin = () => setLoginOpen(true);
  const handleCloseLogin = () => setLoginOpen(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingNav onOpenLogin={handleOpenLogin} />
      <main>
        <Hero onOpenLogin={handleOpenLogin} />
        <MissionVision />
        <ServicesGrid />
        <HistoryTimeline />
      </main>
      <LandingFooter onOpenLogin={handleOpenLogin} />

      <LoginModal open={loginOpen} onClose={handleCloseLogin} />
    </div>
  );
}
