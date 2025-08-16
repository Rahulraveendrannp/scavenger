import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';

interface SimpleQRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title: string;
}

const SimpleQRScanner: React.FC<SimpleQRScannerProps> = ({ onScan, onClose, title }) => {
  const [error, setError] = useState<string>('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Check camera permissions on mount
  useEffect(() => {
    // Camera should be available on modern browsers
    setIsCameraReady(true);
    setError('');
  }, []);

  const handleResult = (result: any, error: any) => {
    if (error) {
      // Filter out normal QR scanning errors (e2, e1, etc. are just "no QR found")
      if (error.message && (error.message.includes('e2') || error.message.includes('e1') || error.message.includes('No QR code found'))) {
        // This is normal - no QR code in view, don't show error
        return;
      }
      
      console.error('QR Scan error:', error);
      if (!isCameraReady) {
        setError('Camera not ready. Please check permissions.');
      }
      return;
    }
    
    if (result) {
      console.log('QR Code scanned:', result.text);
      onScan(result.text);
    }
  };

  const handleRetry = () => {
    setError('');
    window.location.reload(); // Simple way to retry camera permissions
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera/Manual Input Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={toggleManualInput}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showManualInput 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            📷 Camera
          </button>
          <button
            onClick={toggleManualInput}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showManualInput 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            ⌨️ Manual Input
          </button>
        </div>

        {/* QR Scanner */}
        {!showManualInput && isCameraReady && (
          <div className="mb-4">
            <QrReader
              onResult={handleResult}
              constraints={{ facingMode: 'environment' }}
              scanDelay={300}
            />
          </div>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <div className="mb-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">⌨️</div>
              <p className="text-gray-600 mb-4">Enter QR code manually</p>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter QR code here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-gray-600 text-sm">
          {showManualInput ? (
            <>
              <p>⌨️ Type the QR code manually</p>
              <p>📱 Use this if camera isn't working</p>
            </>
          ) : (
            <>
              <p>📱 Point your camera at the QR code</p>
              <p>✅ Scanning will happen automatically</p>
              <p className="text-orange-600 mt-2">💡 If camera view is white, try Manual Input</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleQRScanner;
