
// Fix: Use a more robust import pattern for React to ensure JSX intrinsic elements are recognized
import * as React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl md:text-6xl',
    xl: 'text-6xl md:text-8xl'
  };

  return (
    <div className={`flex items-center space-x-2 font-black italic tracking-tighter uppercase select-none ${className}`}>
      <span className={`${sizeClasses[size]} kairo-shimmer`}>
        Kairo
      </span>
      <span className={`${sizeClasses[size]} text-indigo-500 kairo-glow`}>
        4k
      </span>
    </div>
  );
};

export default BrandLogo;
