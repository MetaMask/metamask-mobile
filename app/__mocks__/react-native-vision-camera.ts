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

const mockCodeScanner = {
  codeTypes: ['qr'],
  onCodeScanned: jest.fn(),
};

const Camera = React.forwardRef(() => null);

const useCameraDevice = jest.fn(() => mockDevice);
const useCameraPermission = jest.fn(() => mockPermission);
const useCodeScanner = jest.fn(() => mockCodeScanner);

export { Camera, useCameraDevice, useCameraPermission, useCodeScanner };
