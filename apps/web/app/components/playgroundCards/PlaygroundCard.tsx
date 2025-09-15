import React from 'react';
import Link from 'next/link';

interface PlaygroundCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

export default function PlaygroundCard({
  icon,
  title,
  description,
  href = '#',
  className = '',
}: PlaygroundCardProps) {
  const cardContent = (
    <div
      className={`group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-300 cursor-pointer h-full ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white/90 transition-colors">
            {title}
          </h3>
          <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/80 transition-colors">
            {description}
          </p>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
    </div>
  );

  if (href === '#') {
    return cardContent;
  }

  return (
    <Link href={href} className="block h-full">
      {cardContent}
    </Link>
  );
}
