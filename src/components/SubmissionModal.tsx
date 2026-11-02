import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Sparkles,
  Leaf,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Video,
} from 'lucide-react';
import { usePet } from '../context/PetContext.tsx';
import type { FeedResponse } from '../types.ts';
import {
  isMobileDevice,
  getInitialCameraConstraints,
  getFallbackConstraints,
  diagnoseCameraError,
  enumerateVideoDevices,
  type CameraDevice,
  type CameraDiagnostic,
} from '../lib/camera.ts';
import { compressImageForUpload } from '../lib/imageCompression.ts';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewJournal?: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  onViewJournal,
}) => {
  const { activeChallenge, feedPetWithPhoto, preferredCamera, setPreferredCamera } = usePet();

  const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'analyzing' | 'result'>('select');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(preferredCamera);

  // Camera device management & diagnostics
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraDiagnostic, setCameraDiagnostic] = useState<CameraDiagnostic | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

  // Analysis result
  const [feedResult, setFeedResult] = useState<FeedResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const isMobile = isMobileDevice();

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setCapturedBlob(null);
      setPreviewUrl(null);
      setFeedResult(null);
      setAnalysisError(null);
      setCameraDiagnostic(null);
      setIsInitializingCamera(false);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Ensure stream is bound whenever mode enters 'camera'
  useEffect(() => {
    if (mode === 'camera' && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.play().catch((err) => console.warn('[Camera] Auto-play was prevented:', err));
      }
    }
  }, [mode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  /**
   * Starts camera stream with desktop vs mobile intelligence:
   * - Desktop: requests unconstrained video: true (or deviceId) so laptop & USB cameras open reliably
   * - Mobile: requests facingMode: { ideal: facing }
   */
  const startCamera = async (options?: { deviceId?: string; facing?: 'environment' | 'user' }) => {
    stopCamera();
    setCameraDiagnostic(null);
    setIsInitializingCamera(true);

    const targetFacing = options?.facing || facingMode;
    const targetDeviceId = options?.deviceId || selectedDeviceId;

    try {
      let stream: MediaStream | null = null;
      const initialConstraints = getInitialCameraConstraints({
        deviceId: targetDeviceId,
        preferredFacing: targetFacing,
      });

      try {
        stream = await navigator.mediaDevices.getUserMedia(initialConstraints);
      } catch (firstErr: any) {
        // If initial request failed with constraint issues, try graceful fallback
        console.info('[Camera] Primary constraints failed, attempting fallback constraints:', firstErr?.name);
        const fallback = getFallbackConstraints(isMobile, targetFacing);
        stream = await navigator.mediaDevices.getUserMedia(fallback);
      }

      if (stream) {
        streamRef.current = stream;
        setMode('camera');
        setCameraDiagnostic(null); // Clear any error cleanly

        // Enumerate video devices so user can choose between integrated and USB cameras
        const devices = await enumerateVideoDevices();
        setAvailableCameras(devices);

        // Find active deviceId from stream tracks
        const activeTrack = stream.getVideoTracks()[0];
        const settings = activeTrack?.getSettings();
        if (settings?.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        } else if (devices.length > 0 && !targetDeviceId) {
          setSelectedDeviceId(devices[0].deviceId);
        }

        // Attach stream to video element if ready
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[Camera] Failed to initialize live camera:', err);
      const diagnostic = diagnoseCameraError(err);
      setCameraDiagnostic(diagnostic);
      setMode('select');
    } finally {
      setIsInitializingCamera(false);
    }
  };

  const switchCameraDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera({ deviceId });
  };

  const toggleFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setPreferredCamera(nextFacing);
    startCamera({ facing: nextFacing });
  };

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const rawWidth = video.videoWidth || 800;
    const rawHeight = video.videoHeight || 600;

    // Scale to max 1024 to dramatically speed up upload and Gemini vision evaluation
    const maxDim = 1024;
    let width = rawWidth;
    let height = rawHeight;
    if (rawWidth > maxDim || rawHeight > maxDim) {
      if (rawWidth > rawHeight) {
        width = maxDim;
        height = Math.round((rawHeight * maxDim) / rawWidth);
      } else {
        height = maxDim;
        width = Math.round((rawWidth * maxDim) / rawHeight);
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const optimizedBlob = await compressImageForUpload(blob, { maxDimension: 1024, quality: 0.82 });
            setCapturedBlob(optimizedBlob);
            const url = URL.createObjectURL(optimizedBlob);
            setPreviewUrl(url);
            stopCamera();
            setCameraDiagnostic(null);
            setMode('preview');
          }
        },
        'image/jpeg',
        0.85
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAnalysisError('Please choose a valid image file (JPG, PNG, WebP).');
        return;
      }
      try {
        const optimizedBlob = await compressImageForUpload(file, { maxDimension: 1024, quality: 0.82 });
        setCapturedBlob(optimizedBlob);
        const url = URL.createObjectURL(optimizedBlob);
        setPreviewUrl(url);
        stopCamera();
        setCameraDiagnostic(null);
        setMode('preview');
      } catch (err) {
        console.warn('[Upload] Compression failed, using raw file:', err);
        setCapturedBlob(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        stopCamera();
        setCameraDiagnostic(null);
        setMode('preview');
      }
    }
  };

  const submitPhoto = async () => {
    if (!capturedBlob) return;
    setMode('analyzing');
    setAnalysisError(null);

    try {
      const result = await feedPetWithPhoto(capturedBlob);
      setFeedResult(result);
      setMode('result');
    } catch (err: any) {
      console.error('[Submission] Error:', err);
      setAnalysisError(err.message || 'Verification failed. Please try again.');
      setMode('preview');
    }
  };

  const retake = () => {
    setFeedResult(null);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCameraDiagnostic(null);
    setMode('select');
  };

  const openAppInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2c7a4b] text-white flex items-center justify-center shadow-sm">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base leading-tight">Submit Nature Discovery</h3>
              <p className="text-xs text-gray-500">Gemini Multimodal Computer Vision Verification</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-full transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col">
          {/* Active Craving Reminder Box */}
          {activeChallenge && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-[#2c7a4b] shrink-0 mt-0.5">
                <Leaf size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800">
                    Active Craving
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-semibold">
                    +{activeChallenge.xp_reward} XP
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 leading-snug mt-0.5">
                  {activeChallenge.title}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {activeChallenge.description}
                </p>
              </div>
            </div>
          )}

          {/* Analysis Error Message */}
          {analysisError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* MODE: Select Source (Camera or Upload) */}
          {mode === 'select' && (
            <div className="py-2 flex flex-col items-center justify-center text-center">
              {/* Detailed Diagnostic Warning Banner: Only shown if camera failed */}
              {cameraDiagnostic && (
                <div className="w-full mb-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-left shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                      <AlertCircle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                        {cameraDiagnostic.title}
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        {cameraDiagnostic.message}
                      </p>
                      {cameraDiagnostic.actionHint && (
                        <p className="text-[11px] text-amber-950 font-medium mt-1.5 bg-amber-100/60 p-2 rounded-lg">
                          💡 <strong>Suggestion:</strong> {cameraDiagnostic.actionHint}
                        </p>
                      )}

                      {/* If restricted by embedded iframe preview, allow opening in full tab */}
                      {cameraDiagnostic.canOpenNewTab && (
                        <button
                          type="button"
                          onClick={openAppInNewTab}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ExternalLink size={13} />
                          <span>Open in Direct Browser Tab</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#2c7a4b] flex items-center justify-center mb-3 shadow-inner">
                <Sparkles size={30} />
              </div>
              <h4 className="text-base font-bold text-gray-800 mb-1">Capture Nature Outdoors</h4>
              <p className="text-xs text-gray-500 max-w-xs mb-5">
                Photograph real natural textures, botanical patterns, or rocks to feed your pet.
              </p>

              {/* Main Source Selection Actions */}
              <div className="flex flex-col gap-2.5 w-full max-w-sm">
                {/* 1. Live WebRTC Viewfinder (Works on Laptops, Desktops, Chrome, Edge, and Mobile) */}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  disabled={isInitializingCamera}
                  className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-sm shadow-md transition active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <Video size={18} />
                  <span>
                    {isInitializingCamera
                      ? 'Connecting Camera...'
                      : isMobile
                      ? 'Open Live Camera Viewfinder'
                      : 'Connect Laptop / Desktop Webcam'}
                  </span>
                </button>

                {/* 2. Device Camera (Native App) or Gallery Upload Alternatives */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#2c7a4b] font-bold text-xs border border-emerald-200 transition shadow-xs active:scale-95 cursor-pointer"
                  >
                    <Camera size={15} />
                    <span>Device Camera App</span>
                  </button>

                  <label className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs border border-gray-300 hover:border-[#2c7a4b] transition shadow-xs active:scale-95 cursor-pointer">
                    <Upload size={15} className="text-[#2c7a4b]" />
                    <span>Upload Photo</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Hidden native device camera capture input */}
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="mt-5 text-[11px] text-gray-400 flex items-center gap-1.5">
                <Leaf size={12} className="text-[#2c7a4b]" />
                <span>Zero impact principle: Please do not pick rare plants or disturb wildlife habitats.</span>
              </div>
            </div>
          )}

          {/* MODE: Live Camera Viewfinder */}
          {mode === 'camera' && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-[#2c7a4b] shadow-inner">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Framing Reticle */}
                <div className="absolute inset-8 border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-white/90 bg-black/50 px-2.5 py-1 rounded-full font-semibold backdrop-blur-xs">
                    Align natural specimen here
                  </span>
                </div>

                {/* Top Controls: Camera Selector (Desktop & Laptop multi-cam) & Flip (Mobile) */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                  {/* Multi-Camera Selector for Laptops with Integrated + USB Webcams */}
                  {availableCameras.length > 1 ? (
                    <div className="flex items-center bg-black/70 backdrop-blur-xs rounded-full px-2.5 py-1 border border-white/20 text-white text-xs max-w-[200px]">
                      <Video size={13} className="mr-1.5 text-emerald-400 shrink-0" />
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => switchCameraDevice(e.target.value)}
                        className="bg-transparent text-white font-medium text-[11px] outline-none cursor-pointer truncate"
                      >
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.deviceId || idx} value={cam.deviceId} className="bg-gray-900 text-white">
                            {cam.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] text-white font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Camera</span>
                    </div>
                  )}

                  {/* Flip Lens Toggle (Only relevant on mobile devices with front/back lenses) */}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={toggleFacing}
                      className="bg-black/70 hover:bg-black text-white p-2 rounded-full transition shadow-md backdrop-blur-xs border border-white/20 cursor-pointer"
                      title="Flip camera"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Viewfinder Action Buttons */}
              <div className="mt-4 flex items-center gap-3 w-full max-w-xs">
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="flex-1 py-3 px-5 rounded-full bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Snap Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setMode('select');
                  }}
                  className="py-3 px-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Snapshot Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* MODE: Photo Preview & Confirm */}
          {mode === 'preview' && previewUrl && (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] max-h-[300px] rounded-2xl overflow-hidden bg-black border-2 border-[#2c7a4b] shadow-md">
                <img
                  src={previewUrl}
                  alt="Nature discovery preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-xs text-gray-500 mt-2.5 text-center">
                Review your photograph before sending it to Gemini Multimodal AI for analysis.
              </p>

              <div className="mt-4 flex items-center gap-3 w-full max-w-sm">
                <button
                  type="button"
                  onClick={submitPhoto}
                  className="flex-1 py-3 px-6 rounded-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={18} />
                  <span>Munch This Item! 🍃</span>
                </button>
                <button
                  type="button"
                  onClick={retake}
                  className="py-3 px-4 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition cursor-pointer"
                >
                  Retake
                </button>
              </div>
            </div>
          )}

          {/* MODE: Analyzing with Gemini AI */}
          {mode === 'analyzing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-100 border-t-[#2c7a4b] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  🌿
                </div>
              </div>
              <h4 className="text-base font-bold text-gray-800 mb-1">
                Gemini AI Examining Photograph
              </h4>
              <p className="text-xs text-gray-500 max-w-xs animate-pulse">
                Evaluating botanical textures, visual features, and outdoor validity against craving...
              </p>
            </div>
          )}

          {/* MODE: Verification Result Breakdown */}
          {mode === 'result' && feedResult && (
            <div className="flex flex-col items-center text-left w-full">
              {feedResult.success ? (
                // SUCCESS STATE
                <div className="w-full">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">Discovery Approved! 🎉</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        +{feedResult.xpAwarded} XP awarded to {feedResult.pet?.name}!
                      </p>
                      {feedResult.leveledUp && (
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold shadow-xs">
                          ⭐ Level Up! Evolved to {feedResult.pet?.growth_stage} (Lv. {feedResult.pet?.level})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Verification AI Details Card */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs text-gray-700 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-500">Detected Specimen:</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        {feedResult.verification.detected_object}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-500">AI Confidence:</span>
                      <span className="font-bold text-emerald-700">
                        {Math.round(feedResult.verification.confidence * 100)}%
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="font-semibold text-gray-600 block mb-1">Evaluation Reason:</span>
                      <p className="text-gray-700 leading-relaxed bg-white p-2.5 rounded-xl border border-gray-200">
                        {feedResult.verification.reason}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="font-semibold text-emerald-800 block mb-1">
                        🌿 {feedResult.pet?.name} says:
                      </span>
                      <p className="italic font-medium text-emerald-900 bg-emerald-100/50 p-2.5 rounded-xl border border-emerald-200">
                        "{feedResult.message}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onViewJournal) onViewJournal();
                      }}
                      className="flex-1 py-3 px-5 rounded-full bg-[#2c7a4b] hover:bg-[#1e5c36] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View in Nature Journal</span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-3 px-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                // REJECTED STATE
                <div className="w-full">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-full bg-amber-500 text-white shrink-0 mt-0.5">
                      <XCircle size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-950">Craving Not Satisfied</h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Gemini could not verify this as matching "{activeChallenge?.title}".
                      </p>
                    </div>
                  </div>

                  {/* Verification AI Details Card */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs text-gray-700 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-500">Observed in Photo:</span>
                      <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                        {feedResult.verification.detected_object}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="font-semibold text-gray-600 block mb-1">Feedback:</span>
                      <p className="text-gray-700 leading-relaxed bg-white p-2.5 rounded-xl border border-gray-200">
                        {feedResult.verification.reason}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70">
                      <span className="font-semibold text-amber-900 block mb-1">
                        🌿 Terra says:
                      </span>
                      <p className="italic font-medium text-amber-900 bg-amber-100/50 p-2.5 rounded-xl border border-amber-200">
                        "{feedResult.message}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={retake}
                      className="flex-1 py-3 px-5 rounded-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={15} />
                      <span>Try Another Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-3 px-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
