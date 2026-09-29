import React, { useState } from 'react';

interface ProfileAvatarProps {
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

export function getInitials(name?: string, username?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (username && username.trim()) {
    return username.trim().replace(/^@/, '').slice(0, 2).toUpperCase();
  }
  return 'NM';
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-bold',
  lg: 'w-14 h-14 text-base font-extrabold',
  xl: 'w-20 h-20 text-xl font-black',
};

const STATUS_SIZES = {
  xs: 'w-1.5 h-1.5 bottom-0 right-0',
  sm: 'w-2 h-2 bottom-0 right-0',
  md: 'w-2.5 h-2.5 bottom-0.5 right-0.5',
  lg: 'w-3.5 h-3.5 bottom-1 right-1',
  xl: 'w-4 h-4 bottom-1 right-1',
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  username,
  avatarUrl,
  size = 'md',
  className = '',
  showStatus = false,
  isOnline = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name, username);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const statusSize = STATUS_SIZES[size] || STATUS_SIZES.md;

  const hasValidImage = avatarUrl && avatarUrl.trim() !== '' && !imageError;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${className}`}>
      {hasValidImage ? (
        <img
          src={avatarUrl}
          alt={name || username || 'User Avatar'}
          onError={() => setImageError(true)}
          className={`${sizeClass} rounded-full object-cover ring-2 ring-purple-500/30 shadow-md`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold tracking-wider ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20`}
          title={name || username}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute rounded-full border-2 border-[#0a0b10] ${
            isOnline ? 'bg-emerald-400' : 'bg-gray-500'
          } ${statusSize}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
