import React from "react";

function ClaimPrize() {
  return (
    <div className="min-h-screen bg-[#F5F5DC] p-4">
      <h1 className="text-4xl font-bold text-center text-[#8B4513] mt-10">
        Claim Your Prize
      </h1>
      <p className="text-center text-lg text- mt-4">
        Congratulations on completing the scavenger hunt! Your prize can be
        claimed by showing the generated QR code at booth 5.
      </p>
      <div className="flex justify-center mt-8">
        <img
          src="/path/to/generated-qr-code.png"
          alt="Generated QR Code"
          className="w-64 h-64"
        />
      </div>
    </div>
  );
}

export default ClaimPrize;
