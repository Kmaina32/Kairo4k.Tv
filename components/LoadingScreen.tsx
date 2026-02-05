
import * as React from 'react';
import BrandLogo from './BrandLogo';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617]">
      <div className="relative flex flex-col items-center">
        <BrandLogo size="xl" className="mb-4" />
        
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-indigo-500 w-1/3 animate-[loading_2s_infinite_linear]"></div>
        </div>
        
        <style>{`
          @keyframes loading {
            0% { left: -40%; width: 30%; }
            50% { width: 50%; }
            100% { left: 110%; width: 30%; }
          }
        `}</style>
        
        <p className="mt-8 text-indigo-400 font-black tracking-[0.5em] text-[10px] uppercase animate-pulse">
          Initializing 4K Frequency
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
