'use client';

import { User } from '../types/auth';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({
  user,
  size = 'sm',
  className = '',
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {user.picture ? (
        <img
          src={user.picture}
          alt={`${user.firstName} ${user.lastName}`}
          className="w-full h-full rounded-full object-cover border-2 border-white/20 cursor-pointer"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-white/20 border-2 border-white/20 flex items-center justify-center text-white font-semibold cursor-pointer">
          {getInitials(user.firstName, user.lastName)}
        </div>
      )}
    </div>
  );
}
