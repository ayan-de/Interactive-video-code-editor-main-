'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Aurora from './components/Aurora';
import { Button } from './components/ui/button';
import Navbar from './components/Navbar';

export default function Home() {
  const [recordingCount, setRecordingCount] = useState(0);

  // Count saved recordings
  useEffect(() => {
    const countRecordings = () => {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('recording_')) {
          count++;
        }
      }
      setRecordingCount(count);
    };

    countRecordings();

    // Update count when storage changes
    const handleStorageChange = () => {
      countRecordings();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(countRecordings, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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
        <Navbar />

        {/* Hero Section */}
        <header className="flex-grow flex items-center justify-center text-center px-4 md:px-6">
          <div className="mb-8 max-w-4xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              Interactive Video Code Editor
            </h1>
            <div className="mb-6">
              <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-300 mb-2 drop-shadow-md px-2 inline-flex items-center justify-center">
                <span className="sr-only">Slogan:</span>
                <span className="relative inline-flex items-center">
                  <span className="mr-2">"Stop recording</span>
                  <span className="relative inline-block mx-2">
                    <span className="text-white/90 font-semibold">pixels</span>
                    <svg
                      className="absolute inset-0 -translate-y-1/3"
                      width="98"
                      height="108"
                      viewBox="0 0 98 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M4 12c14-6 24-9 34-6 10 3 26 6 42 0"
                        stroke="#ff6b6b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-90"
                      />
                      <path
                        d="M4 12c14-6 24-9 34-6 10 3 26 6 42 0"
                        stroke="#fff"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="6 6"
                        opacity="0.18"
                      />
                    </svg>
                  </span>

                  <span className="ml-2 flex items-center">
                    <span className="text-cyan-300 font-semibold mx-2">
                      instead capture
                    </span>
                    <span className="relative inline-flex items-center ml-1">
                      <span className="text-white/100 font-bold px-1">
                        DOM"
                      </span>
                      <svg
                        width="80"
                        height="90"
                        viewBox="0 0 50 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute -top-7 -left-3"
                        aria-hidden
                      >
                        <ellipse
                          cx="30"
                          cy="20"
                          rx="28"
                          ry="15"
                          stroke="#7cff67"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity="0.9"
                        />
                        <path
                          d="M8 28c6-6 16-12 22-12s16 6 22 12"
                          stroke="#7cff67"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="4 6"
                          opacity="0.6"
                        />
                      </svg>
                      <svg
                        width="30"
                        height="24"
                        viewBox="0 0 30 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute -right-6 -bottom-6 rotate-12"
                        aria-hidden
                      >
                        <path
                          d="M2 22c6-3 14-6 24-14"
                          stroke="#ffd166"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M24 8c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2z"
                          fill="#ffd166"
                        />
                      </svg>
                    </span>
                  </span>
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-6 md:mt-8 px-4">
              <Link href="/record" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 font-semibold px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 border-0 h-12 md:h-14 cursor-pointer"
                >
                  Start Recording
                </Button>
              </Link>

              <Link href="/view" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-2 border-white/50 bg-transparent backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/70 font-semibold px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base md:text-lg shadow-lg transition-all duration-300 h-12 md:h-14 cursor-pointer"
                >
                  <span className="hidden sm:inline">View Recordings</span>
                  <span className="sm:hidden">
                    View ({recordingCount > 0 ? recordingCount : 0})
                  </span>
                  <span className="hidden sm:inline">
                    {recordingCount > 0 && ` (${recordingCount})`}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <footer className="text-center py-4 md:py-6 text-gray-300 px-4">
          <p className="text-sm md:text-base">
            Built with Next.js, Monaco Editor, and TypeScript by{' '}
            <a
              href="https://github.com/ayan-de"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent hover:from-purple-500 hover:to-cyan-400 transition-colors"
            >
              Ayan
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
