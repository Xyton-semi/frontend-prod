import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, fallback }) => (
  <div className="h-8 w-8 rounded-full bg-red-100 overflow-hidden border border-red-200 flex items-center justify-center flex-shrink-0">
    {src ? (
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    ) : (
      <span className="text-xs font-semibold text-red-700">{fallback}</span>
    )}
  </div>
);

export default Avatar;