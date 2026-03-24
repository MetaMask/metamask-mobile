// Mock for expo-local-authentication module

// Enums - matching the actual expo-local-authentication values
export const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
} as const;

export const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC_WEAK: 2,
  BIOMETRIC_STRONG: 3,
} as const;

// Functions
export const isEnrolledAsync = jest.fn().mockResolvedValue(false);
export const supportedAuthenticationTypesAsync = jest
  .fn()
  .mockResolvedValue([]);
export const getEnrolledLevelAsync = jest
  .fn()
  .mockResolvedValue(SecurityLevel.NONE);
export const authenticateAsync = jest.fn().mockResolvedValue({ success: true });
export const hasHardwareAsync = jest.fn().mockResolvedValue(true);

// Default export for namespace imports (import * as LocalAuthentication)
export default {
  AuthenticationType,
  SecurityLevel,
  isEnrolledAsync,
  supportedAuthenticationTypesAsync,
  getEnrolledLevelAsync,
  authenticateAsync,
  hasHardwareAsync,
};
