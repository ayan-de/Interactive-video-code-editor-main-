'use client';

import { Button } from './ui/button';

export default function Navbar() {
  return (
    <div className="w-full flex justify-center pt-3 md:pt-6 px-3 md:px-6">
      <nav className="flex justify-between items-center backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 md:px-6 py-2 md:py-3 max-w-2xl w-full">
        <div className="flex items-center">
          <h2 className="text-lg md:text-xl font-bold text-white">Tantrica</h2>
        </div>
        <div className="flex gap-1 md:gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm rounded-full transition-all duration-300 cursor-pointer"
          >
            Login
          </Button>
          <Button
            size="sm"
            className="bg-white text-black hover:bg-gray-100 px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm font-semibold rounded-full transition-all duration-300 cursor-pointer"
          >
            Sign Up
          </Button>
        </div>
      </nav>
    </div>
  );
}
