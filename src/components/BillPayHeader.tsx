
import React from 'react';
import { useState, useEffect } from 'react';

const BillPayHeader = () => {
  const [isShining, setIsShining] = useState(false);

  // Toggle animation state when logo is clicked
  const handleLogoClick = () => {
    setIsShining(true);
    
    // Reset animations after they complete
    setTimeout(() => {
      setIsShining(false);
    }, 1500);
  };

  // Automatically animate once when component loads
  useEffect(() => {
    setIsShining(true);
    
    const shineTimer = setTimeout(() => {
      setIsShining(false);
    }, 1500);
    
    return () => {
      clearTimeout(shineTimer);
    };
  }, []);

  return (
    <>
      <header className="w-full bg-black text-white py-4">
        <div className="container max-w-6xl mx-auto px-4 flex justify-center items-center">
          <div className="relative overflow-hidden">
            <img 
              src="/lovable-uploads/e8eaa692-e261-431e-8372-5b65831bb62d.png" 
              alt="CELERO Logo" 
              className="h-8"
              onClick={handleLogoClick}
              style={{ cursor: 'pointer' }}
            />
            {isShining && (
              <div 
                className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-70 transform skew-x-[-20deg]"
                style={{ animation: 'shine 1.5s ease-in-out' }}
              />
            )}
          </div>
        </div>
      </header>
      {/* Colorful Gradient Separator */}
      <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-pink-500 via-purple-500 via-blue-500 to-blue-600"></div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shine {
            0% {
              left: -100%;
            }
            100% {
              left: 200%;
            }
          }
        `
      }} />
    </>
  );
};

export default BillPayHeader;
