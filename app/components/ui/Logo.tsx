import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => (
  <div className={`flex items-center font-bold text-xl tracking-widest text-red-900 ${className}`}>
    XYTON
  </div>
);

export default Logo;