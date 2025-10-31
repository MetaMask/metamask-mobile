// Mock for expo-updates module
export const channel = 'test-channel';
export const runtimeVersion = '1.0.0';
export const isEmbeddedLaunch = true;
export const isEnabled = true;

export const checkForUpdateAsync = jest.fn();
export const fetchUpdateAsync = jest.fn();
export const reloadAsync = jest.fn();
export const useUpdates = jest.fn();

export const UpdateEventType = {
  ERROR: 'error',
  NO_UPDATE_AVAILABLE: 'noUpdateAvailable',
  UPDATE_AVAILABLE: 'updateAvailable',
};

export const UpdateCheckResult = {
  isAvailable: false,
  manifest: null,
};

export default {
  channel,
  runtimeVersion,
  isEmbeddedLaunch,
  isEnabled,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  useUpdates,
  UpdateEventType,
  UpdateCheckResult,
};
