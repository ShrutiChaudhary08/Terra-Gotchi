import { describe, it, expect } from 'vitest';
import {
  getInitialCameraConstraints,
  getFallbackConstraints,
  diagnoseCameraError,
} from '../src/lib/camera.ts';

describe('Camera Constraints & Desktop Compatibility', () => {
  it('generates unconstrained desktop constraints without forcing facingMode environment', () => {
    // In node/vitest, navigator.userAgent is desktop-like by default
    const constraints = getInitialCameraConstraints();
    expect(constraints.video).toBeDefined();

    // Verify facingMode is NOT forced to 'environment' on desktop
    const videoConfig = constraints.video as MediaTrackConstraints;
    expect(videoConfig.facingMode).toBeUndefined();
  });

  it('generates specific deviceId constraints when deviceId is provided', () => {
    const constraints = getInitialCameraConstraints({ deviceId: 'usb-cam-xyz' });
    const videoConfig = constraints.video as MediaTrackConstraints;
    expect(videoConfig.deviceId).toEqual({ exact: 'usb-cam-xyz' });
  });

  it('generates fallback constraints for desktop as video: true', () => {
    const fallback = getFallbackConstraints(false);
    expect(fallback).toEqual({ video: true });
  });

  it('generates fallback constraints for mobile with targetFacing', () => {
    const fallback = getFallbackConstraints(true, 'user');
    expect(fallback).toEqual({ video: { facingMode: 'user' } });
  });
});

describe('Camera Error Diagnostics & Specificity', () => {
  it('categorizes NotAllowedError as permission_denied with helpful browser instructions', () => {
    const err = new Error('Permission denied');
    err.name = 'NotAllowedError';

    const diag = diagnoseCameraError(err);
    expect(diag.type).toBe('permission_denied');
    expect(diag.title).toBe('Camera Permission Denied');
    expect(diag.actionHint).toContain('lock or camera icon');
  });

  it('categorizes NotReadableError as already_in_use when another app occupies camera', () => {
    const err = new Error('Device in use');
    err.name = 'NotReadableError';

    const diag = diagnoseCameraError(err);
    expect(diag.type).toBe('already_in_use');
    expect(diag.title).toBe('Camera Already in Use');
    expect(diag.message).toContain('Zoom, Microsoft Teams, Google Meet');
  });

  it('categorizes NotFoundError as not_found when no camera exists', () => {
    const err = new Error('Requested device not found');
    err.name = 'NotFoundError';

    const diag = diagnoseCameraError(err);
    expect(diag.type).toBe('not_found');
    expect(diag.title).toBe('No Camera Detected');
  });

  it('categorizes OverconstrainedError separately from permission denial', () => {
    const err = new Error('Constraints could not be satisfied');
    err.name = 'OverconstrainedError';

    const diag = diagnoseCameraError(err);
    expect(diag.type).toBe('overconstrained');
    expect(diag.type).not.toBe('permission_denied');
    expect(diag.title).toBe('Camera Constraints Not Supported');
  });

  it('categorizes SecurityError correctly', () => {
    const err = new Error('Action not allowed by security policy');
    err.name = 'SecurityError';

    const diag = diagnoseCameraError(err);
    expect(diag.type).toBe('security_error');
    expect(diag.canOpenNewTab).toBe(true);
  });
});
