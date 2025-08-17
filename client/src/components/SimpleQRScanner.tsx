import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";

interface SimpleQRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title: string;
  expectedQRCode: string; // NEW: The exact QR code data we expect
}

const SimpleQRScanner: React.FC<SimpleQRScannerProps> = ({
  onScan,
  onClose,
  title,
  expectedQRCode,
}) => {
  const [error, setError] = useState<string>("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>("");
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [invalidQRMessage, setInvalidQRMessage] = useState<string>(""); // NEW: Invalid QR message

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Utility function to check for active media streams
  const checkActiveStreams = () => {
    console.log("🔍 Checking for active media streams...");

    // Check if there are any active media streams globally
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const cameras = devices.filter(
            (device) => device.kind === "videoinput"
          );
          console.log("📷 Available cameras:", cameras.length);
        })
        .catch((err) => {
          console.log("❌ Could not enumerate devices:", err);
        });
    }

    // Check video element
    if (videoRef.current) {
      const video = videoRef.current;
      console.log("🎥 Video element state:", {
        paused: video.paused,
        srcObject: !!video.srcObject,
        readyState: video.readyState,
      });

      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        console.log(
          "🎬 Video stream tracks:",
          stream.getTracks().map((track) => ({
            kind: track.kind,
            readyState: track.readyState,
            enabled: track.enabled,
          }))
        );
      }
    }

    // Check streamRef
    if (streamRef.current) {
      console.log(
        "📡 StreamRef tracks:",
        streamRef.current.getTracks().map((track) => ({
          kind: track.kind,
          readyState: track.readyState,
          enabled: track.enabled,
        }))
      );
    }
  };

  // Initialize camera when component mounts or when switching from manual input
  useEffect(() => {
    console.log(
      "🔄 useEffect [showManualInput] triggered, showManualInput:",
      showManualInput
    );

    if (!showManualInput) {
      console.log("📷 Starting camera initialization...");
      initializeCamera();
    } else {
      console.log("⌨️ Manual input mode, not starting camera");
    }

    // Cleanup function for this effect
    return () => {
      console.log("🔴 useEffect [showManualInput] cleanup running");
      cleanup();
    };
  }, [showManualInput]);

  const initializeCamera = async () => {
    try {
      setError("");
      setIsCameraReady(false);
      setInvalidQRMessage(""); // Clear invalid QR message

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported by this browser");
      }

      // Request camera permission with rear camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Prefer rear camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                setIsCameraReady(true);
                setIsScanning(true);
                startQRDetection();
              })
              .catch((playError) => {
                console.error("Error playing video:", playError);
                setError(
                  "Failed to start camera preview. Please check permissions."
                );
              });
          }
        };

        videoRef.current.onerror = () => {
          setError("Video stream error. Please refresh and try again.");
        };
      }
    } catch (err: any) {
      console.error("Camera initialization error:", err);
      handleCameraError(err);
    }
  };

  const handleCameraError = (err: any) => {
    if (err.name === "NotAllowedError") {
      setError(
        "Camera permission denied. Please allow camera access and refresh the page."
      );
    } else if (err.name === "NotFoundError") {
      setError("No camera found on this device.");
    } else if (err.name === "NotReadableError") {
      setError(
        "Camera is being used by another application. Please close other apps and try again."
      );
    } else if (err.name === "OverconstrainedError") {
      setError("Camera constraints not supported. Trying fallback...");
      // Try again with less strict constraints
      retryWithFallbackConstraints();
    } else {
      setError("Failed to access camera. Try manual input instead.");
    }
  };

  const retryWithFallbackConstraints = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true, // Simple constraint as fallback
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          setIsCameraReady(true);
          setIsScanning(true);
          setError(""); // Clear error
          startQRDetection();
        });
      }
    } catch (fallbackError) {
      console.error("Fallback camera error:", fallbackError);
      setError("Unable to access camera with any settings.");
    }
  };

  // NEW: Validate if scanned QR matches expected QR
  const validateQRCode = (scannedData: string): boolean => {
    return scannedData === expectedQRCode;
  };

  const startQRDetection = useCallback(() => {
    const detectQR = () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        isCameraReady &&
        isScanning &&
        !isProcessingQR
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw current video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data from canvas
          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          // Detect QR code
          const qrCode = jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
              inversionAttempts: "dontInvert",
            }
          );

          if (qrCode && qrCode.data) {
            console.log("QR Code detected:", qrCode.data);
            console.log("Expected QR Code:", expectedQRCode);

            // NEW: Validate the QR code
            const isValidQR = validateQRCode(qrCode.data);
            console.log("QR Code validation result:", isValidQR);

            if (isValidQR) {
              // Valid QR - proceed with success
              setIsScanning(false); // Stop scanning immediately
              setIsProcessingQR(true);
              setScanResult(qrCode.data);
              setInvalidQRMessage(""); // Clear any invalid message

              // Stop camera stream
              cleanup();

              // Add a small delay to show the scan result before calling onScan
              setTimeout(() => {
                onScan(qrCode.data);
              }, 1000);

              return; // Stop scanning
            } else {
              // Invalid QR - show error but continue scanning
              console.log("❌ Invalid QR code scanned:", qrCode.data);
              setInvalidQRMessage(
                `❌ Invalid QR code! Expected specific checkpoint QR.`
              );

              // Clear the invalid message after 3 seconds and continue scanning
              setTimeout(() => {
                setInvalidQRMessage("");
              }, 3000);

              // Continue scanning (don't return)
            }
          }
        }
      }

      // Continue scanning
      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(detectQR);
      }
    };

    detectQR();
  }, [isCameraReady, isScanning, isProcessingQR, expectedQRCode, onScan]);

  // Start QR detection when camera is ready
  useEffect(() => {
    if (isCameraReady && isScanning) {
      startQRDetection();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraReady, isScanning, startQRDetection]);

  const cleanup = () => {
    console.log("🔴 Cleaning up QR Scanner - stopping camera and animations");
    setIsScanning(false);
    setIsCameraReady(false);
    setIsProcessingQR(false);

    // Cancel animation frame first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log("✅ Animation frame cancelled");
    }

    // Clear any intervals
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      console.log("✅ Scan interval cleared");
    }

    // CRITICAL: Stop video element completely
    if (videoRef.current) {
      console.log("🔴 Stopping video element...");
      const video = videoRef.current;

      // Pause the video
      video.pause();
      console.log("✅ Video paused");

      // Remove event listeners
      video.onloadedmetadata = null;
      video.onerror = null;

      // Get the current stream from video
      const videoStream = video.srcObject as MediaStream;
      if (videoStream) {
        console.log("🔴 Found stream in video element, stopping tracks...");
        videoStream.getTracks().forEach((track, index) => {
          console.log(
            `🔴 Video element track ${index}:`,
            track.kind,
            track.readyState,
            track.enabled
          );
          track.stop();
          console.log(
            `✅ Video element track ${index} stopped:`,
            track.readyState
          );
        });
      }

      // Clear srcObject
      video.srcObject = null;
      console.log("✅ Video srcObject cleared");

      // Force video to load empty source
      video.load();
      console.log("✅ Video element reloaded with no source");
    }

    // Stop stream reference tracks
    if (streamRef.current) {
      console.log("🔴 Stopping streamRef tracks...");
      streamRef.current.getTracks().forEach((track, index) => {
        console.log(
          `🔴 StreamRef track ${index}:`,
          track.kind,
          track.readyState,
          track.enabled
        );
        if (track.readyState !== "ended") {
          track.stop();
          console.log(`✅ StreamRef track ${index} stopped:`, track.readyState);
        } else {
          console.log(`⚠️ StreamRef track ${index} was already ended`);
        }
      });
      streamRef.current = null;
      console.log("✅ StreamRef cleared");
    }

    // Force garbage collection hint (only in some dev environments)
    if ((window as any).gc) {
      (window as any).gc();
      console.log("✅ Forced garbage collection");
    }

    console.log("🔴 QR Scanner cleanup completed - Camera should be OFF");

    // Additional verification after a short delay
    setTimeout(() => {
      console.log("🔍 Verifying camera shutdown...");
      if (videoRef.current && videoRef.current.srcObject) {
        console.log("⚠️ WARNING: Video still has srcObject after cleanup!");
      } else {
        console.log("✅ Verified: Video srcObject is null");
      }

      if (streamRef.current) {
        console.log("⚠️ WARNING: StreamRef still exists after cleanup!");
      } else {
        console.log("✅ Verified: StreamRef is null");
      }
    }, 100);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      console.log("Manual QR code entered:", manualCode.trim());

      // NEW: Validate manual input as well
      const isValidQR = validateQRCode(manualCode.trim());

      if (isValidQR) {
        onScan(manualCode.trim());
        setManualCode("");
        setInvalidQRMessage(""); // Clear any invalid message
      } else {
        setInvalidQRMessage(
          `❌ Invalid QR code! This is not the correct checkpoint QR.`
        );
        // Clear the invalid message after 3 seconds
        setTimeout(() => {
          setInvalidQRMessage("");
        }, 3000);
      }
    }
  };

  const toggleManualInput = () => {
    console.log(
      "🔄 Toggling manual input, current showManualInput:",
      showManualInput
    );

    if (!showManualInput) {
      // Switching TO manual input - cleanup camera immediately
      console.log("🔴 Switching to manual input - cleaning up camera");
      cleanup();
    }

    setShowManualInput(!showManualInput);
    setError("");
    setScanResult("");
    setIsProcessingQR(false);
    setInvalidQRMessage(""); // Clear invalid QR message when toggling
  };

  const handleRetry = () => {
    setError("");
    setScanResult("");
    setIsProcessingQR(false);
    setInvalidQRMessage(""); // Clear invalid QR message
    cleanup();

    if (!showManualInput) {
      setTimeout(() => {
        initializeCamera();
      }, 100);
    }
  };

  // Handle component unmount and cleanup
  useEffect(() => {
    console.log("🔄 Component mounted - QR Scanner initialized");

    // Cleanup function that runs when component unmounts
    return () => {
      console.log(
        "🔴 QR Scanner component unmounting - forcing camera cleanup"
      );

      // More aggressive unmount cleanup
      if (videoRef.current) {
        const video = videoRef.current;
        video.pause();

        // Get stream from video element directly
        const stream = video.srcObject as MediaStream;
        if (stream) {
          console.log("🔴 UNMOUNT: Stopping tracks from video element...");
          stream.getTracks().forEach((track) => {
            console.log(
              "🔴 UNMOUNT: Force stopping track:",
              track.kind,
              track.readyState
            );
            track.stop();
          });
        }

        video.srcObject = null;
        video.load(); // Force reload
      }

      // Also stop from streamRef
      if (streamRef.current) {
        console.log("🔴 UNMOUNT: Stopping tracks from streamRef...");
        streamRef.current.getTracks().forEach((track) => {
          if (track.readyState !== "ended") {
            console.log(
              "🔴 UNMOUNT: Force stopping streamRef track:",
              track.kind
            );
            track.stop();
          }
        });
        streamRef.current = null;
      }

      // Run regular cleanup as well
      cleanup();
    };
  }, []);

  // Emergency cleanup on window unload and visibility change
  useEffect(() => {
    const emergencyCleanup = () => {
      console.log("🚨 EMERGENCY: Stopping all camera activity");

      // Stop all tracks from video element
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          console.log("🚨 EMERGENCY: Stopping track:", track.kind);
          track.stop();
        });
        videoRef.current.srcObject = null;
      }

      // Stop all tracks from streamRef
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log("🚨 EMERGENCY: Stopping streamRef track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
    };

    const handleBeforeUnload = () => {
      console.log("🔴 Window unloading - emergency camera cleanup");
      emergencyCleanup();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("🔴 Page hidden - emergency camera stop");
        emergencyCleanup();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      emergencyCleanup();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      <div className="bg-black text-white rounded-xl p-4 max-w-md w-full mx-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={() => {
              console.log("🔴 Close button clicked - cleaning up camera");

              // Check current state before cleanup
              checkActiveStreams();

              cleanup(); // Stop camera when closing

              // Check state after cleanup
              setTimeout(() => {
                console.log("🔍 Post-cleanup verification:");
                checkActiveStreams();
              }, 200);

              // Small delay to ensure cleanup completes
              setTimeout(() => {
                onClose();
              }, 300);
            }}
            className="text-gray-300 hover:text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Expected QR Info */}
        <div className="mb-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
          <p className="text-blue-200 text-sm font-semibold">
            🎯 Looking for specific checkpoint QR
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Only the correct QR code will be accepted
          </p>
        </div>

        {/* Camera/Manual Input Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => !showManualInput || toggleManualInput()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showManualInput
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            📷 Camera
          </button>
          <button
            onClick={() => showManualInput || toggleManualInput()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showManualInput
                ? "bg-orange-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            ⌨️ Manual
          </button>
        </div>

        {/* NEW: Invalid QR Message Display */}
        {invalidQRMessage && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg animate-pulse">
            <p className="text-red-200 text-sm font-semibold">
              {invalidQRMessage}
            </p>
            <p className="text-red-300 text-xs mt-1">
              Please scan the correct checkpoint QR code
            </p>
          </div>
        )}

        {/* Scan Result Display - Only for Valid QRs */}
        {scanResult && (
          <div className="mb-4 p-3 bg-green-900 border border-green-600 rounded-lg">
            <p className="text-green-200 text-sm font-semibold">
              ✅ Valid QR Code Detected!
            </p>
            <p className="text-green-300 text-xs mt-1 font-mono break-all">
              {scanResult}
            </p>
          </div>
        )}

        {/* Camera View with Viewfinder */}
        {!showManualInput && (
          <div className="relative mb-4">
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: "4/3" }}
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                style={{
                  display: isCameraReady ? "block" : "none",
                  position: "relative",
                  zIndex: 1,
                }}
              />

              {/* Loading State */}
              {!isCameraReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">
                      Initializing camera...
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Overlay */}
              {isCameraReady && !isProcessingQR && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Viewfinder Frame - positioned over video */}
                  <div className="relative z-10">
                    <div className="w-48 h-48 relative">
                      {/* Dimmed overlay with cut-out center */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.6) 45%)",
                        }}
                      ></div>

                      {/* Corner brackets - Change color based on invalid QR */}
                      <div
                        className={`absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 drop-shadow-lg ${
                          invalidQRMessage ? "border-red-500" : "border-white"
                        }`}
                      ></div>
                      <div
                        className={`absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 drop-shadow-lg ${
                          invalidQRMessage ? "border-red-500" : "border-white"
                        }`}
                      ></div>
                      <div
                        className={`absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 drop-shadow-lg ${
                          invalidQRMessage ? "border-red-500" : "border-white"
                        }`}
                      ></div>
                      <div
                        className={`absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 drop-shadow-lg ${
                          invalidQRMessage ? "border-red-500" : "border-white"
                        }`}
                      ></div>

                      {/* Scanning line animation */}
                      {isScanning && (
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            className={`absolute w-full h-0.5 ${
                              invalidQRMessage ? "bg-red-500" : "bg-orange-500"
                            }`}
                            style={{
                              top: "50%",
                              boxShadow: invalidQRMessage
                                ? "0 0 20px rgba(239, 68, 68, 0.8)"
                                : "0 0 20px rgba(249, 115, 22, 0.8)",
                              animation: "scanLine 2s ease-in-out infinite",
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CSS Animation for scan line */}
              <style>{`
                @keyframes scanLine {
                  0% { transform: translateY(-100px); opacity: 0; }
                  50% { opacity: 1; }
                  100% { transform: translateY(100px); opacity: 0; }
                }
              `}</style>

              {/* Processing Overlay - Only for Valid QRs */}
              {isProcessingQR && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-green-400 font-semibold text-lg">
                      Valid QR Code Scanned!
                    </p>
                    <p className="text-gray-300 text-sm">
                      Processing checkpoint...
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden canvas for QR processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Scanning Status */}
            {isCameraReady && !isProcessingQR && (
              <div className="text-center mt-2">
                <p
                  className={`text-sm font-medium ${
                    invalidQRMessage ? "text-red-400" : "text-orange-400"
                  }`}
                >
                  {isScanning
                    ? invalidQRMessage
                      ? "🔴 Scanning... (Invalid QR detected)"
                      : "📷 Scanning for checkpoint QR..."
                    : "⏸️ Scanning paused"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <div className="mb-4">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center bg-gray-800">
              <div className="text-4xl mb-4">⌨️</div>
              <p className="text-gray-300 mb-4">
                Enter the specific checkpoint QR code
              </p>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setInvalidQRMessage(""); // Clear invalid message when typing
                }}
                onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="Enter QR code data here..."
                className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Validate QR Code
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg">
            <p className="text-red-200 text-sm mb-2">⚠️ {error}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
              >
                Use Manual Input
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-gray-400 text-sm">
          {showManualInput ? (
            <>
              <p>⌨️ Type the checkpoint QR code data</p>
              <p>🎯 Only the correct QR will be accepted</p>
              <p className="text-xs mt-2">💡 Press Enter to validate quickly</p>
            </>
          ) : (
            <>
              <p>📱 Point camera at the checkpoint QR code</p>
              <p>🎯 Only the correct QR will show success</p>
              <p className="text-orange-400 mt-2">
                💡 Invalid QRs will be rejected
              </p>
            </>
          )}
        </div>

        {/* Test QR Codes for Development - Updated with expected code highlighted */}
        {showManualInput && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-2">Quick test codes:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setManualCode("TALABAT_CARD_COMPLETE")}
                className={`p-2 rounded text-left hover:bg-gray-600 transition-colors ${
                  expectedQRCode === "TALABAT_CARD_COMPLETE"
                    ? "bg-green-700 border border-green-500"
                    : "bg-gray-700"
                }`}
              >
                Card Game {expectedQRCode === "TALABAT_CARD_COMPLETE" && "✓"}
              </button>
              <button
                onClick={() => setManualCode("TALABAT_PUZZLE_COMPLETE")}
                className={`p-2 rounded text-left hover:bg-gray-600 transition-colors ${
                  expectedQRCode === "TALABAT_PUZZLE_COMPLETE"
                    ? "bg-green-700 border border-green-500"
                    : "bg-gray-700"
                }`}
              >
                Puzzle {expectedQRCode === "TALABAT_PUZZLE_COMPLETE" && "✓"}
              </button>
              <button
                onClick={() => setManualCode("TALABAT_RACE_COMPLETE")}
                className={`p-2 rounded text-left hover:bg-gray-600 transition-colors ${
                  expectedQRCode === "TALABAT_RACE_COMPLETE"
                    ? "bg-green-700 border border-green-500"
                    : "bg-gray-700"
                }`}
              >
                Car Race {expectedQRCode === "TALABAT_RACE_COMPLETE" && "✓"}
              </button>
              <button
                onClick={() => setManualCode("TALABAT_SCAVENGER_ENTRY")}
                className={`p-2 rounded text-left hover:bg-gray-600 transition-colors ${
                  expectedQRCode === "TALABAT_SCAVENGER_ENTRY"
                    ? "bg-green-700 border border-green-500"
                    : "bg-gray-700"
                }`}
              >
                Scavenger Hunt{" "}
                {expectedQRCode === "TALABAT_SCAVENGER_ENTRY" && "✓"}
              </button>
            </div>
            <p className="text-xs text-green-400 mt-2">
              ✓ = Expected QR for this checkpoint
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleQRScanner;
