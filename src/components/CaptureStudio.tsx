import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import type { SampleKit } from '../types.ts';
import {
  captureVideoFrame,
  compressImageFile,
  imageUrlToCompressedBase64,
} from '../utils/image.ts';

interface CaptureStudioProps {
  isAnalyzing: boolean;
  analyzeError: string | null;
  lastScanNote: string | null;
  lastPreviewUrl: string | null;
  sampleKits: SampleKit[];
  onAnalyzeImage: (
    base64: string,
    mimeType: string,
    previewUrl: string,
    source: 'camera' | 'photo'
  ) => Promise<void>;
  onLoadSampleKit: (kit: SampleKit) => void;
  onClearError: () => void;
}

export function CaptureStudio({
  isAnalyzing,
  analyzeError,
  lastScanNote,
  lastPreviewUrl,
  sampleKits,
  onAnalyzeImage,
  onLoadSampleKit,
  onClearError,
}: CaptureStudioProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isDragging, setIsDragging] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async (requestedFacing: 'environment' | 'user' = facingMode) => {
    onClearError();
    setCameraError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        'Live camera access is unavailable in this browser window. Use Upload Photo below to snap or select a picture.'
      );
      return;
    }

    stopCamera();
    setCameraStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in your browser bar or upload a photo instead.'
          : 'Could not open the live camera on this device. You can upload or take a photo using Upload Photo.';
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setCameraStarting(false);
    }
  };

  const handleModeSwitch = (nextMode: 'upload' | 'camera') => {
    setMode(nextMode);
    setCameraError(null);
    onClearError();
    if (nextMode === 'upload') {
      stopCamera();
    } else {
      void startCamera(facingMode);
    }
  };

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    void startCamera(next);
  };

  const handleSnapFrame = async () => {
    if (!videoRef.current || isAnalyzing) return;
    try {
      const captured = captureVideoFrame(videoRef.current);
      await onAnalyzeImage(captured.base64, captured.mimeType, captured.previewUrl, 'camera');
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Could not capture video frame.');
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCameraError('Please choose an image file (JPG, PNG, WebP, or HEIC).');
      return;
    }
    onClearError();
    setCameraError(null);
    const compressed = await compressImageFile(file);
    await onAnalyzeImage(compressed.base64, compressed.mimeType, compressed.previewUrl, 'photo');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleScanSamplePhoto = async (kit: SampleKit) => {
    onClearError();
    try {
      const compressed = await imageUrlToCompressedBase64(kit.imageUrl);
      await onAnalyzeImage(compressed.base64, compressed.mimeType, kit.imageUrl, 'photo');
    } catch {
      // Fallback to direct kit load if image fetch is interrupted
      onLoadSampleKit(kit);
    }
  };

  return (
    <section
      id="capture"
      className="bg-white border border-[#E5E5E0] rounded-xl p-6 flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717]">
            Capture Ingredients
          </h2>
          <p className="text-sm text-[#52524E] mt-1">
            Point your camera at your fridge, counter, or groceries, or upload a photo.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-[#F4F3EE] rounded-lg">
          <button
            type="button"
            onClick={() => handleModeSwitch('upload')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-[#171717] shadow-xs'
                : 'text-[#52524E] hover:text-[#171717]'
            }`}
          >
            Upload Photo
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('camera')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'camera'
                ? 'bg-white text-[#171717] shadow-xs'
                : 'text-[#52524E] hover:text-[#171717]'
            }`}
          >
            Live Camera
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border border-dashed transition-colors p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-[260px] ${
            isDragging
              ? 'border-[#1F5132] bg-[#1F5132]/5'
              : 'border-[#D4D3CC] bg-[#FAF9F6]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            id="ingredient-photo-input"
          />

          {lastPreviewUrl && !isAnalyzing ? (
            <div className="w-full flex flex-col sm:flex-row items-center gap-6 text-left">
              <div className="w-full sm:w-52 h-40 rounded-lg overflow-hidden border border-[#E5E5E0] bg-[#EFECE4] shrink-0">
                <img
                  src={lastPreviewUrl}
                  alt="Captured ingredients preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#1F5132] mb-1">
                  Latest scan complete
                </p>
                <p className="text-sm text-[#171717] leading-relaxed mb-4">
                  {lastScanNote || 'Ingredients from your photo were added to your pantry list.'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Scan Another Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('camera')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-[#D4D3CC] text-[#171717] rounded-lg hover:bg-[#F4F3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Use Camera
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5E0] flex items-center justify-center mb-4 text-[#1F5132]">
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <p className="text-base font-medium text-[#171717] mb-1">
                {isAnalyzing
                  ? 'Reading ingredients from your photo...'
                  : 'Drop a photo of your ingredients here'}
              </p>
              <p className="text-sm text-[#52524E] max-w-md mb-5">
                {isAnalyzing
                  ? 'Identifying produce, proteins, pantry items, and approximate quantities.'
                  : 'Works with open fridge shelves, grocery hauls, or items laid out on the counter.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Choose or Take Photo
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleModeSwitch('camera')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-[#D4D3CC] text-[#171717] rounded-lg hover:bg-[#F4F3EE] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Open Camera
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E5E0] bg-[#141413] overflow-hidden">
          <div className="relative aspect-[16/10] w-full flex items-center justify-center bg-[#141413]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && !cameraStarting && (
              <div className="p-6 text-center max-w-md">
                <Camera className="w-8 h-8 text-white/70 mx-auto mb-3" />
                <p className="text-sm text-white/90 mb-4 leading-relaxed">
                  {cameraError || 'Camera preview is paused.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void startCamera(facingMode)}
                    className="px-4 py-2 text-sm font-medium bg-white text-[#171717] rounded-lg hover:bg-[#F4F3EE] transition-colors cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('upload')}
                    className="px-4 py-2 text-sm font-medium border border-white/25 text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Upload Photo Instead
                  </button>
                </div>
              </div>
            )}

            {cameraStarting && (
              <div className="flex items-center gap-2 text-sm text-white/85">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting camera...</span>
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                <div className="bg-white text-[#171717] px-4 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1F5132]" />
                  <span>Identifying ingredients...</span>
                </div>
              </div>
            )}
          </div>

          {cameraActive && (
            <div className="px-4 py-3 bg-[#1D1D1B] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/90 bg-white/10 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Flip Camera
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('upload')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleSnapFrame()}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#2C7A4B] text-white rounded-lg hover:bg-[#23633D] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capture &amp; Identify
              </button>
            </div>
          )}
        </div>
      )}

      {(analyzeError || cameraError) && mode === 'upload' && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{analyzeError || cameraError}</div>
        </div>
      )}

      {/* Starter visual samples so anyone can test photo scanning or load a kitchen immediately */}
      <div className="pt-2 border-t border-[#EFECE4]">
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-medium text-[#52524E]">
            Try with a sample countertop photo
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sampleKits.map((kit) => (
            <div
              key={kit.id}
              className="group border border-[#E5E5E0] rounded-lg overflow-hidden bg-[#FAF9F6] flex flex-col"
            >
              <div className="aspect-[4/3] w-full bg-[#EFECE4] overflow-hidden">
                {failedImages[kit.id] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-[#52524E]">
                    <ImageIcon className="w-6 h-6 mb-1.5 opacity-60" />
                    <span className="text-xs font-medium">{kit.title}</span>
                  </div>
                ) : (
                  <img
                    src={kit.imageUrl}
                    alt={kit.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [kit.id]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                <div>
                  <p className="text-sm font-semibold text-[#171717] leading-snug">
                    {kit.title}
                  </p>
                  <p className="text-xs text-[#52524E] mt-0.5 line-clamp-2">
                    {kit.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => void handleScanSamplePhoto(kit)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#D4D3CC] text-[#171717] rounded-md hover:border-[#1F5132] hover:text-[#1F5132] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Scan Photo
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => onLoadSampleKit(kit)}
                    className="px-2.5 py-1.5 text-xs font-medium text-[#1F5132] hover:underline disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    Quick Load
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
