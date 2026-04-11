'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRecordingCount } from '@/hooks/useRecordingCount';

interface StudioLayoutProps {
  children: React.ReactNode;
}

export default function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();
  const recordingCount = useRecordingCount();

  const isRecordPage = pathname?.includes('/record');
  const isViewPage = pathname?.includes('/view');
  const navbarText = isRecordPage ? 'Video' : 'OpenScrim';

  return (
    <div className="min-h-screen bg-[#20201e] flex flex-col">
      <div>
        <Navbar mainText={navbarText}></Navbar>
      </div>

      {/* Common Navigation */}
      <nav className="px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
          >
            ← Back to Home
          </Link>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <Link
              href="/record"
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                isRecordPage
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>📹</span>
              Record
            </Link>
            <Link
              href="/view"
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                isViewPage
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>▶️</span>
              View {recordingCount > 0 && `(${recordingCount})`}
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="p-6 pt-0 flex-grow">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
