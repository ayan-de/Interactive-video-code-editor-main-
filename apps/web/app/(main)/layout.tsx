'use client';

import Aurora from '../components/Aurora';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={['#7cff67', '#B19EEF', '#5227FF']}
          amplitude={1.2}
          blend={0.5}
          speed={0.8}
        />
      </div>

      <div className="relative z-10 min-h-screen bg-black/20 backdrop-blur-sm flex flex-col">
        {/* Top Navigation Bar */}
        <Navbar mainText="Tantrica" />

        {/* Page Content */}
        {children}

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
