'use client';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-[#20201e] flex flex-col">
      <Navbar mainText="Video" />
      {children}
      <Footer />
    </div>
  );
}
