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
    <div className="min-h-screen bg-background flex flex-col">
      <div>
        <Navbar mainText={navbarText}></Navbar>
      </div>

      <nav className="px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-primary hover:text-primary/80 font-medium flex items-center gap-2"
          >
            Back to Home
          </Link>

          <div className="flex items-center gap-1 bg-card rounded-lg p-1 shadow-sm border border-border">
            <Link
              href="/record"
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                isRecordPage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Record
            </Link>
            <Link
              href="/view"
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                isViewPage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
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
