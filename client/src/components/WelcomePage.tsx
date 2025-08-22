import React from "react";

interface WelcomePageProps {
  onStart: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#FF5900] relative overflow-hidden flex flex-col">
      {/* Header section with header.svg */}
      <div className="flex-1 flex items-center justify-center px-6 pt-3">
        <img 
          src="/header.svg" 
          alt="Welcome header" 
          className="w-full max-w-xs md:max-w-md"
        />
      </div>

      {/* Text section with text.svg */}
      <div className="flex-1 flex items-center justify-center px-6">
        <img 
          src="/text.svg" 
          alt="Welcome text" 
          className="w-full max-w-[250px] md:max-w-sm"
        />
      </div>

      {/* Let's Go button */}
      <div className="flex justify-center pb-12 px-6">
        <button
          onClick={onStart}
          className="bg-white text-[#FF5900] px-12 py-2 rounded-full text-md font-bold hover:bg-gray-50 transition-colors shadow-lg w-64 md:w-80"
        >
          Let's Go
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;
