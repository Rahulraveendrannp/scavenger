import React from "react";

interface WelcomePageProps {
  onStart: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onStart }) => {
  return (
    <div className="h-[100svh] bg-[#FF5900] relative overflow-hidden font-body">
      {/* Header section with header.svg */}
      <div className="h-[80svh] flex flex-col my-auto">

      
      <div className="flex-1 flex items-center justify-center px-6 pt-3">
        <img 
          src="/header.svg" 
          alt="Welcome header" 
          className="w-full max-w-xs md:max-w-md"
        />
      </div>

      {/* Text section with text.svg + Let's Go button */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <img 
          src="/text.svg" 
          alt="Welcome text" 
          className="w-full max-w-[250px] md:max-w-sm"
        />
        <button
          onClick={onStart}
          className="mt-12 bg-[#F4EDE3] text-[#FF5900] px-12 py-2 rounded-full text-md font-heading hover:bg-gray-50 transition-colors shadow-lg w-64 md:w-80"
        >
          Let's Go
        </button>
      </div>
      </div>
    </div>
  );
};

export default WelcomePage;
