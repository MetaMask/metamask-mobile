import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  UpdateCheckResultNotAvailableReason,
} from 'expo-updates';
import { useFeatureFlag } from './useFeatureFlag';
import { useOTAUpdates } from './useOTAUpdates';
import Logger from '../../util/Logger';

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./useFeatureFlag', () => {
  const actual = jest.requireActual('./useFeatureFlag');
  return {
    ...actual,
    useFeatureFlag: jest.fn(),
  };
});

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
  const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<
    typeof useFeatureFlag
  >;
  const mockCheckForUpdateAsync = checkForUpdateAsync as jest.MockedFunction<
    typeof checkForUpdateAsync
  >;
  const mockFetchUpdateAsync = fetchUpdateAsync as jest.MockedFunction<
    typeof fetchUpdateAsync
  >;
  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  });

  it('returns isCheckingUpdates as false when feature flag is disabled', async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('skips update check in development mode', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(result.current.isCheckingUpdates).toBe(false);
    });
    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('checks for updates when feature flag is enabled', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
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
    mockUseFeatureFlag.mockReturnValue(true);
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

  it('fetches update and exposes hasUpdateAvailable when a new update is available', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
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

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(result.current.isCheckingUpdates).toBe(false);
      expect(result.current.hasUpdateAvailable).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'OTAUpdateModal',
        }),
      );
    });
  });

  it('sets isCheckingUpdates to false and hasUpdateAvailable to false when update is fetched but not new', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
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
      expect(result.current.hasUpdateAvailable).toBe(false);
    });
  });

  it('logs error and sets isCheckingUpdates to false when check fails', async () => {
    const mockError = new Error('Update check failed');
    mockUseFeatureFlag.mockReturnValue(true);
    mockCheckForUpdateAsync.mockRejectedValue(mockError);

    const { result } = renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'OTA Updates: Error checking for updates, continuing with current version',
      );
      expect(result.current.isCheckingUpdates).toBe(false);
      expect(result.current.hasUpdateAvailable).toBe(false);
    });
  });

  it('checks for updates when feature flag changes from disabled to enabled', async () => {
    mockUseFeatureFlag.mockReturnValue(false);
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

    mockUseFeatureFlag.mockReturnValue(true);
    rerender();

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('does not check for updates again when feature flag changes from enabled to disabled', async () => {
    mockUseFeatureFlag.mockReturnValueOnce(true).mockReturnValue(false);
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
    rerender();

    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
  });

  it('starts with isCheckingUpdates as true', () => {
    mockUseFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useOTAUpdates());

    expect(result.current.isCheckingUpdates).toBe(true);
  });

  it('calls update check and fetch in order', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
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

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockFetchUpdateAsync).toHaveBeenCalled();
    });

    const checkOrder = mockCheckForUpdateAsync.mock.invocationCallOrder[0];
    const fetchOrder = mockFetchUpdateAsync.mock.invocationCallOrder[0];
    expect(checkOrder).toBeLessThan(fetchOrder);
  });
});
