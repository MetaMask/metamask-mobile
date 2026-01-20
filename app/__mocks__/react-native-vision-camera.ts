import React from 'react';

const mockDevice = {
  id: 'back',
  position: 'back',
  hasFlash: true,
  hasTorch: true,
  isMultiCam: false,
  minFocusDistance: 10,
  supportsFocus: true,
  supportsRawCapture: false,
  supportsLowLightBoost: false,
  name: 'Mock Camera',
  neutralZoom: 1,
  minZoom: 1,
  maxZoom: 10,
  formats: [],
  hardwareLevel: 'limited' as const,
  sensorOrientation: 90,
};

const mockPermission = {
  hasPermission: true,
  requestPermission: jest.fn().mockResolvedValue('granted'),
};

let capturedOnCodeScanned:
  | ((codes: { value: string; type: string }[]) => Promise<void> | void)
  | null = null;
let capturedOnError: ((error: Error) => Promise<void> | void) | null = null;

export const resetCapturedCallbacks = () => {
  capturedOnCodeScanned = null;
  capturedOnError = null;
};

export const getCapturedCallbacks = () => ({
  onCodeScanned: capturedOnCodeScanned,
  onError: capturedOnError,
});

const Camera = React.forwardRef(
  (
    props: {
      onError?: (error: Error) => Promise<void> | void;
      codeScanner?: {
        onCodeScanned: (
          codes: { value: string; type: string }[],
        ) => Promise<void> | void;
      };
    },
    _ref: unknown,
  ) => {
    if (props.onError) {
      capturedOnError = props.onError;
    }
    if (props.codeScanner?.onCodeScanned) {
      capturedOnCodeScanned = props.codeScanner.onCodeScanned;
    }
    return React.createElement('View', { testID: 'camera-mock' });
  },
);

const useCameraDevice = jest.fn(() => mockDevice);
const useCameraPermission = jest.fn(() => mockPermission);
const useCodeScanner = jest.fn((config) => {
  if (config?.onCodeScanned) {
    capturedOnCodeScanned = config.onCodeScanned;
  }
  return {
    codeTypes: ['qr'],
    onCodeScanned: config?.onCodeScanned || jest.fn(),
  };
});

export { Camera, useCameraDevice, useCameraPermission, useCodeScanner };
