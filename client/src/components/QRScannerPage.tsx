// components/QRScannerPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Camera, QrCode } from 'lucide-react';

interface QRScannerPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const QRScannerPage: React.FC<QRScannerPageProps> = ({ onBack, onSuccess }) => {
  const { checkpointId } = useParams();
  const [scanStatus, setScanStatus] = useState<'ready' | 'scanning' | 'success' | 'error'>('ready');
  const [scanMessage, setScanMessage] = useState('');
  const [qrInput, setQrInput] = useState('');
  
  // Get checkpoint title from ID and predefined QR codes
  const getCheckpointTitle = (id: string) => {
    const titles: { [key: string]: string } = {
      '1': 'Reception Desk',
      '2': 'Conference Room',
      '3': 'Kitchen Area',
      '4': 'Supply Closet',
      '5': 'Manager Office',
      '6': 'Break Room',
      '7': 'IT Department',
      '8': 'Main Workspace'
    };
    return titles[id] || 'Checkpoint';
  };

  // Predefined QR codes for each checkpoint
  const getExpectedQRCode = (id: string) => {
    const qrCodes: { [key: string]: string } = {
      '1': 'TALABAT_HUNT_RECEPTION_DESK',
      '2': 'TALABAT_HUNT_CONFERENCE_ROOM',
      '3': 'TALABAT_HUNT_KITCHEN_AREA',
      '4': 'TALABAT_HUNT_SUPPLY_CLOSET',
      '5': 'TALABAT_HUNT_MANAGER_OFFICE',
      '6': 'TALABAT_HUNT_BREAK_ROOM',
      '7': 'TALABAT_HUNT_IT_DEPARTMENT',
      '8': 'TALABAT_HUNT_MAIN_WORKSPACE'
    };
    return qrCodes[id] || '';
  };

  const checkpointTitle = getCheckpointTitle(checkpointId || '1');

  const openCamera = () => {
    setScanStatus('scanning');
    
    // For mobile devices, try to open camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // This will request camera permission and show camera feed
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          // Clean up the stream after a short delay
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
          }, 2000);
          // Camera opened successfully
          console.log('Camera opened');
          // In a real app, you'd implement QR code detection here
          // For now, we'll simulate the scanning process
          setTimeout(() => {
            simulateQRScan();
          }, 2000);
        })
        .catch(err => {
          console.error('Camera access denied:', err);
          // Fallback to manual input
          setScanStatus('ready');
          alert('Camera access denied. Please enter QR code manually.');
        });
    } else {
      // Fallback for devices without camera
      setScanStatus('ready');
      alert('Camera not available. Please enter QR code manually.');
    }
  };

  const simulateQRScan = () => {
    // Simulate QR scanning result
    const isSuccess = Math.random() > 0.3; // 70% success rate
    if (isSuccess) {
      setScanStatus('success');
      setScanMessage('Great! You found the right QR code. This checkpoint has been cleared.');
      
      // Emit event to notify ScavengerHuntPage that checkpoint is complete
      const event = new CustomEvent('qr-scan-success', {
        detail: { checkpointId: parseInt(checkpointId || '1') }
      });
      window.dispatchEvent(event);
    } else {
      setScanStatus('error');
      setScanMessage('Uh oh! You found QR code. Just not the right one. Keep looking!');
    }
  };

  const handleManualQRInput = () => {
    if (qrInput.trim()) {
      // Validate the manually entered QR code against the expected code
      const expectedCode = getExpectedQRCode(checkpointId || '1');
      
      if (qrInput.trim() === expectedCode) {
        setScanStatus('success');
        setScanMessage('Great! You found the right QR code. This checkpoint has been cleared.');
        
        // Emit event to notify ScavengerHuntPage that checkpoint is complete
        const event = new CustomEvent('qr-scan-success', {
          detail: { checkpointId: parseInt(checkpointId || '1') }
        });
        window.dispatchEvent(event);
      } else {
        setScanStatus('error');
        setScanMessage('Wrong QR code! This is not the QR code for this checkpoint. Keep looking!');
      }
    }
  };

  const resetScanner = () => {
    setScanStatus('ready');
    setScanMessage('');
    setQrInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center p-3 sm:p-4">
        <button onClick={onBack} className="mr-3 sm:mr-4">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">{checkpointTitle}</h1>
          <p className="text-xs sm:text-sm text-gray-400">Scan QR code of this checkpoint.</p>
        </div>
      </div>

      {/* QR Scanner Area */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="relative">
          {/* Scanning Frame */}
          <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-green-500 relative">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-4 border-t-4 border-green-500"></div>
            <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-4 border-t-4 border-green-500"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-l-4 border-b-4 border-green-500"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-r-4 border-b-4 border-green-500"></div>
            
            {/* Scanning area content */}
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              {scanStatus === 'ready' && (
                <div className="text-center">
                  <QrCode className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-2" />
                  <p className="text-green-500 text-xs sm:text-sm">Ready to scan</p>
                </div>
              )}
              
              {scanStatus === 'scanning' && (
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-green-500 text-xs sm:text-sm">Scanning...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons and Status */}
      <div className="p-4 sm:p-6 text-center">
        {scanStatus === 'ready' && (
          <div className="space-y-3 sm:space-y-4">
            <button 
              onClick={openCamera}
              className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Open Camera & Scan QR</span>
            </button>
            
            {/* Manual QR Input Fallback */}
            <div className="space-y-2">
              <p className="text-gray-400 text-xs sm:text-sm">Or enter QR code manually:</p>
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Enter QR code"
                className="w-full px-2 sm:px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm sm:text-base"
              />
              <button
                onClick={handleManualQRInput}
                disabled={!qrInput.trim()}
                className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50 text-sm sm:text-base"
              >
                Verify QR Code
              </button>
              
              {/* Expected QR Code for Testing */}
              <div className="mt-3 p-2 bg-gray-800 rounded text-xs">
                <p className="text-gray-400 mb-1">Expected QR code for testing:</p>
                <p className="text-green-400 font-mono">{getExpectedQRCode(checkpointId || '1')}</p>
              </div>
            </div>
          </div>
        )}

        {scanStatus === 'scanning' && (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-white text-sm sm:text-base">Camera is open. Point at QR code...</p>
            <button 
              onClick={resetScanner}
              className="w-full bg-gray-600 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base"
            >
              Cancel Scanning
            </button>
          </div>
        )}

        {scanStatus === 'success' && (
          <div className="space-y-3 sm:space-y-4">
            <button className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg">
              Success!
            </button>
            <p className="text-white text-sm sm:text-base">{scanMessage}</p>
            <button 
              onClick={onSuccess}
              className="w-full bg-green-600 text-white py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base"
            >
              Continue
            </button>
          </div>
        )}

        {scanStatus === 'error' && (
          <div className="space-y-3 sm:space-y-4">
            <button className="w-full bg-red-600 text-white py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg">
              Error
            </button>
            <p className="text-white text-sm sm:text-base">{scanMessage}</p>
            <button 
              onClick={resetScanner}
              className="w-full bg-red-600 text-white py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScannerPage; 