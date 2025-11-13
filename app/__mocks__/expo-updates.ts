// Mock for expo-updates module
export const channel = 'test-channel';
export const runtimeVersion = '1.0.0';
export const isEmbeddedLaunch = true;
export const isEnabled = true;
export const url = 'https://example.com';
export const checkAutomatically = 'NEVER';
export const updateId = 'mock-update-id';

export const checkForUpdateAsync = jest.fn().mockResolvedValue({
  isAvailable: false,
  manifest: null,
});
export const fetchUpdateAsync = jest.fn().mockResolvedValue({
  isNew: false,
});
export const reloadAsync = jest.fn().mockResolvedValue(undefined);
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
  url,
  updateId,
  checkAutomatically,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  useUpdates,
  UpdateEventType,
  UpdateCheckResult,
};
