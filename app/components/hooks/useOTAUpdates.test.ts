import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
  UpdateCheckResultNotAvailableReason,
} from 'expo-updates';
import { useOTAUpdates } from './useOTAUpdates';
import Logger from '../../util/Logger';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const mockManifest = {
  id: '1',
  createdAt: '2021-01-01',
  runtimeVersion: '1.0.0',
  launchAsset: {
    url: 'https://example.com/asset.js',
  },
  assets: [],
  metadata: {},
  extra: undefined,
};

describe('useOTAUpdates', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockCheckForUpdateAsync = checkForUpdateAsync as jest.MockedFunction<
    typeof checkForUpdateAsync
  >;
  const mockFetchUpdateAsync = fetchUpdateAsync as jest.MockedFunction<
    typeof fetchUpdateAsync
  >;
  const mockReloadAsync = reloadAsync as jest.MockedFunction<
    typeof reloadAsync
  >;
  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(false);
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  });

  it('returns isCheckingUpdates as false when feature flag is disabled', async () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('skips update check in development mode', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('checks for updates when feature flag is enabled', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: false,
      isRollBackToEmbedded: false,
      reason:
        'noUpdateAvailableOnServer' as UpdateCheckResultNotAvailableReason,
      manifest: undefined,
    });

    renderHook(() => useOTAUpdates());
    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('sets isCheckingUpdates to false when no update is available', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: false,
      isRollBackToEmbedded: false,
      reason:
        'noUpdateAvailableOnServer' as UpdateCheckResultNotAvailableReason,
      manifest: undefined,
    });

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
  });

  it('fetches and reloads when a new update is available', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
      reason: undefined,
    });
    mockFetchUpdateAsync.mockResolvedValue({
      isNew: true,
      isRollBackToEmbedded: false,
      manifest: mockManifest,
    });
    mockReloadAsync.mockResolvedValue(undefined);

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockReloadAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('sets isCheckingUpdates to false when update is fetched but not new', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
      reason: undefined,
    });
    mockFetchUpdateAsync.mockResolvedValue({
      isNew: false,
      manifest: undefined,
      isRollBackToEmbedded: false,
    });

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
    expect(mockReloadAsync).not.toHaveBeenCalled();
  });

  it('logs error and sets isCheckingUpdates to false when check fails', async () => {
    const mockError = new Error('Update check failed');
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockRejectedValue(mockError);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'OTA Updates: Error checking for updates, continuing with current version',
      );
      expect(result.current.isCheckingUpdates).toBe(false);
    });
  });

  it('does not block app if reload fails', async () => {
    const mockError = new Error('Reload failed');
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
      reason: undefined,
    });
    mockFetchUpdateAsync.mockResolvedValue({
      isNew: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
    });
    mockReloadAsync.mockRejectedValue(mockError);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'OTA Updates: Error checking for updates, continuing with current version',
      );
      expect(result.current.isCheckingUpdates).toBe(false);
    });
  });

  it('checks for updates when feature flag changes from disabled to enabled', async () => {
    mockUseSelector.mockReturnValue(false);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: false,
      isRollBackToEmbedded: false,
      reason:
        'noUpdateAvailableOnServer' as UpdateCheckResultNotAvailableReason,
      manifest: undefined,
    });

    const { rerender } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });

    mockUseSelector.mockReturnValue(true);
    rerender();

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('does not check for updates again when feature flag changes from enabled to disabled', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: false,
      isRollBackToEmbedded: false,
      reason:
        'noUpdateAvailableOnServer' as UpdateCheckResultNotAvailableReason,
      manifest: undefined,
    });

    const { rerender } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    });

    mockCheckForUpdateAsync.mockClear();
    mockUseSelector.mockReturnValue(false);
    rerender();

    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('starts with isCheckingUpdates as true', () => {
    mockUseSelector.mockReturnValue(true);
    const { result } = renderHook(() => useOTAUpdates());

    expect(result.current.isCheckingUpdates).toBe(true);
  });

  it('handles update check workflow correctly in sequence', async () => {
    mockUseSelector.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
      reason: undefined,
    });
    mockFetchUpdateAsync.mockResolvedValue({
      isNew: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
    });
    mockReloadAsync.mockResolvedValue(undefined);

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockFetchUpdateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockReloadAsync).toHaveBeenCalled();
    });

    const checkOrder = mockCheckForUpdateAsync.mock.invocationCallOrder[0];
    const fetchOrder = mockFetchUpdateAsync.mock.invocationCallOrder[0];
    const reloadOrder = mockReloadAsync.mock.invocationCallOrder[0];

    expect(checkOrder).toBeLessThan(fetchOrder);
    expect(fetchOrder).toBeLessThan(reloadOrder);
  });
});
