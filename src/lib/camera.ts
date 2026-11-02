export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export type CameraErrorType =
  | 'permission_denied'
  | 'already_in_use'
  | 'not_found'
  | 'overconstrained'
  | 'security_error'
  | 'iframe_restricted'
  | 'insecure_context'
  | 'unsupported'
  | 'unknown';

export interface CameraDiagnostic {
  type: CameraErrorType;
  title: string;
  message: string;
  actionHint?: string;
  canOpenNewTab?: boolean;
}

/**
 * Checks if the current client is a mobile device (phone/tablet)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return isMobileUA || isIPadOS;
}

/**
 * Checks whether the current window is embedded within an iframe
 */
export function isEmbeddedInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Checks whether camera permission is blocked by Permissions-Policy or Feature-Policy in an iframe
 */
export function isCameraBlockedByIframePolicy(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isEmbeddedInIframe()) return false;

  try {
    const doc = document as any;
    if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
      if (!doc.permissionsPolicy.allowsFeature('camera')) {
        return true;
      }
    }
    if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
      if (!doc.featurePolicy.allowsFeature('camera')) {
        return true;
      }
    }
  } catch {
    // Cross-origin iframe restrictions
  }
  return false;
}

/**
 * Generates initial MediaStreamConstraints appropriate for the client device:
 * - On Desktop (laptops, PCs): Request { video: true } or by deviceId. Never force facingMode: 'environment'.
 * - On Mobile: Request facingMode: { ideal: 'environment' } with ideal resolution.
 */
export function getInitialCameraConstraints(params?: {
  deviceId?: string;
  preferredFacing?: 'environment' | 'user';
}): MediaStreamConstraints {
  const isMobile = isMobileDevice();

  if (params?.deviceId) {
    return {
      video: {
        deviceId: { exact: params.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  if (isMobile) {
    const facing = params?.preferredFacing || 'environment';
    return {
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }

  // Desktop / Laptop: Use standard unconstrained video first to guarantee
  // integrated webcams and USB cameras open without OverconstrainedError
  return {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

/**
 * Fallback constraints if high resolution or specific constraints fail
 */
export function getFallbackConstraints(isMobile: boolean, targetFacing?: 'environment' | 'user'): MediaStreamConstraints {
  if (isMobile && targetFacing) {
    return {
      video: {
        facingMode: targetFacing,
      },
    };
  }
  return {
    video: true,
  };
}

/**
 * Categorizes camera errors accurately into distinct, actionable diagnostics
 */
export function diagnoseCameraError(err: any): CameraDiagnostic {
  const errName = err?.name || '';
  const errMessage = String(err?.message || '');

  // 1. Insecure context check
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return {
      type: 'insecure_context',
      title: 'Insecure Context (HTTPS Required)',
      message: 'Modern browsers strictly require an HTTPS connection or localhost for camera access.',
      actionHint: 'Please open this application using HTTPS.',
    };
  }

  // 2. Permission Denied
  if (
    errName === 'NotAllowedError' ||
    errName === 'PermissionDeniedError' ||
    errMessage.toLowerCase().includes('permission denied')
  ) {
    const inIframe = isEmbeddedInIframe();
    if (inIframe && isCameraBlockedByIframePolicy()) {
      return {
        type: 'iframe_restricted',
        title: 'Preview Iframe Camera Restricted',
        message: 'Camera access is blocked by the embedded container permissions policy.',
        actionHint: 'Open the application directly in a new browser tab in Chrome or Edge.',
        canOpenNewTab: true,
      };
    }

    return {
      type: 'permission_denied',
      title: 'Camera Permission Denied',
      message: 'Camera access was blocked by your browser settings.',
      actionHint: 'Click the lock or camera icon in your browser address bar, set Camera to "Allow", and try again.',
      canOpenNewTab: inIframe,
    };
  }

  // 3. Camera Already in Use / Occupied
  if (
    errName === 'NotReadableError' ||
    errName === 'TrackStartError' ||
    errMessage.toLowerCase().includes('could not start') ||
    errMessage.toLowerCase().includes('in use')
  ) {
    return {
      type: 'already_in_use',
      title: 'Camera Already in Use',
      message: 'Your webcam is currently occupied by another program (such as Zoom, Microsoft Teams, Google Meet, or another browser window).',
      actionHint: 'Close other applications or tabs that may be using the camera, then try again.',
    };
  }

  // 4. No Camera Found
  if (
    errName === 'NotFoundError' ||
    errName === 'DevicesNotFoundError' ||
    errMessage.toLowerCase().includes('not found')
  ) {
    return {
      type: 'not_found',
      title: 'No Camera Detected',
      message: 'No video input hardware was found on your device.',
      actionHint: 'Please check that your integrated webcam is enabled or plug in an external USB camera.',
    };
  }

  // 5. Overconstrained
  if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
    return {
      type: 'overconstrained',
      title: 'Camera Constraints Not Supported',
      message: 'Your webcam does not support the requested video resolution or lens mode.',
      actionHint: 'Switching to standard camera settings.',
    };
  }

  // 6. Security / Sandbox Error
  if (errName === 'SecurityError') {
    return {
      type: 'security_error',
      title: 'Security Policy Blocked Camera',
      message: 'Camera access was rejected by security policy or iframe sandbox permissions.',
      actionHint: 'Try opening the app directly in a full browser tab.',
      canOpenNewTab: true,
    };
  }

  // 7. Check browser support if not supported
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return {
      type: 'unsupported',
      title: 'Webcam API Unsupported',
      message: 'Your current browser does not support the modern WebRTC camera API.',
      actionHint: 'Please use modern Google Chrome, Microsoft Edge, or Safari.',
    };
  }

  return {
    type: 'unknown',
    title: 'Camera Connection Failed',
    message: errMessage || 'An unexpected error occurred while connecting to your camera.',
    actionHint: 'You can use the Device Camera or Photo Upload option.',
  };
}

/**
 * Enumerates available video input devices safely
 */
export async function enumerateVideoDevices(): Promise<CameraDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    return videoInputs.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}${index === 0 ? ' (Default)' : ''}`,
      groupId: device.groupId,
    }));
  } catch (err) {
    console.warn('[Camera] Failed to enumerate devices:', err);
    return [];
  }
}
