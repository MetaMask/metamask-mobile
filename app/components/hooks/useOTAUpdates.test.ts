import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
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

const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

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
  const mockLoggerLog = Logger.log as jest.MockedFunction<typeof Logger.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  });

  it('does not check for updates when feature flag is disabled', async () => {
    mockUseFeatureFlag.mockReturnValue(false);

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });
  });

  it('skips update check in development mode even when feature flag is enabled', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    mockUseFeatureFlag.mockReturnValue(true);

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    });
  });

  it('checks for updates when feature flag is enabled and logs when no update is available', async () => {
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
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'OTA Updates: No updates available',
      );
      expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('logs when update is fetched but not new', async () => {
    mockUseFeatureFlag.mockReturnValue(true);
    mockCheckForUpdateAsync.mockResolvedValue({
      isAvailable: true,
      manifest: mockManifest,
      isRollBackToEmbedded: false,
      reason: undefined,
    });
    mockFetchUpdateAsync.mockResolvedValue({
      isNew: false,
      isRollBackToEmbedded: false,
      manifest: undefined,
    });

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockLoggerLog).toHaveBeenCalledWith(
        'OTA Updates: Update fetched but not new',
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('navigates to OTA update modal when a new update is available', async () => {
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

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockCheckForUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAfterInteractions).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'OTAUpdatesModal',
        }),
      );
    });
  });

  it('logs error and continues when update check fails', async () => {
    const mockError = new Error('Update check failed');
    mockUseFeatureFlag.mockReturnValue(true);
    mockCheckForUpdateAsync.mockRejectedValue(mockError);

    renderHook(() => useOTAUpdates());

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        'OTA Updates: Error checking for updates, continuing with current version',
      );
      expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
