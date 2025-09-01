import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Authentication } from '../../core';
import Logger from '../../util/Logger';
import { useSyncSRPs } from './useSyncSRPs';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../core', () => ({
  Authentication: {
    syncSeedPhrases: jest.fn(),
  },
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useSyncSRPs', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockSyncSeedPhrases =
    Authentication.syncSeedPhrases as jest.MockedFunction<
      typeof Authentication.syncSeedPhrases
    >;
  const mockLoggerError = Logger.error as jest.MockedFunction<
    typeof Logger.error
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(false);
  });

  it('returns loading as false when social login is disabled', () => {
    // Arrange
    mockUseSelector.mockReturnValue(false);

    // Act
    const { result } = renderHook(() => useSyncSRPs());

    // Assert
    expect(result.current.loading).toBe(false);
    expect(mockSyncSeedPhrases).not.toHaveBeenCalled();
  });

  it('calls syncSeedPhrases when social login is enabled', async () => {
    // Arrange
    mockUseSelector.mockReturnValue(true);
    mockSyncSeedPhrases.mockResolvedValue(undefined);

    // Act
    renderHook(() => useSyncSRPs());

    // Assert
    await waitFor(() => {
      expect(mockSyncSeedPhrases).toHaveBeenCalledTimes(1);
    });
  });

  it('sets loading to true during sync operation', async () => {
    // Arrange
    mockUseSelector.mockReturnValue(true);
    let resolveSync: (() => void) | undefined;
    const syncPromise = new Promise<void>((resolve) => {
      resolveSync = resolve;
    });
    mockSyncSeedPhrases.mockReturnValue(syncPromise);

    // Act
    const { result } = renderHook(() => useSyncSRPs());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Clean up
    if (resolveSync) {
      resolveSync();
    }
    await act(async () => {
      await syncPromise;
    });
  });

  it('sets loading to false after successful sync', async () => {
    // Arrange
    mockUseSelector.mockReturnValue(true);
    mockSyncSeedPhrases.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useSyncSRPs());

    // Assert
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('logs error and sets loading to false when sync fails', async () => {
    // Arrange
    const mockError = new Error('Sync failed');
    mockUseSelector.mockReturnValue(true);
    mockSyncSeedPhrases.mockRejectedValue(mockError);

    // Act
    const { result } = renderHook(() => useSyncSRPs());

    // Assert
    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        mockError,
        '[useSyncSRPs] error',
      );
      expect(result.current.loading).toBe(false);
    });
  });

  it('does not call syncSeedPhrases when social login is disabled', () => {
    // Arrange
    mockUseSelector.mockReturnValue(false);

    // Act
    renderHook(() => useSyncSRPs());

    // Assert
    expect(mockSyncSeedPhrases).not.toHaveBeenCalled();
  });

  it('calls syncSeedPhrases when social login changes from disabled to enabled', async () => {
    // Arrange
    mockUseSelector.mockReturnValue(false);
    mockSyncSeedPhrases.mockResolvedValue(undefined);

    // Act
    const { rerender } = renderHook(() => useSyncSRPs());

    // Assert - initial state
    expect(mockSyncSeedPhrases).not.toHaveBeenCalled();

    // Act - change to enabled
    mockUseSelector.mockReturnValue(true);
    rerender();

    // Assert
    await waitFor(() => {
      expect(mockSyncSeedPhrases).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call syncSeedPhrases when social login changes from enabled to disabled', async () => {
    // Arrange
    mockUseSelector.mockReturnValue(true);
    mockSyncSeedPhrases.mockResolvedValue(undefined);

    // Act
    const { rerender } = renderHook(() => useSyncSRPs());

    // Assert - initial call
    await waitFor(() => {
      expect(mockSyncSeedPhrases).toHaveBeenCalledTimes(1);
    });

    // Act - change to disabled
    mockSyncSeedPhrases.mockClear();
    mockUseSelector.mockReturnValue(false);
    rerender();

    // Assert
    expect(mockSyncSeedPhrases).not.toHaveBeenCalled();
  });

  it('handles multiple rapid state changes correctly', async () => {
    // Arrange
    mockSyncSeedPhrases.mockResolvedValue(undefined);

    // Act
    const { rerender } = renderHook(() => useSyncSRPs());

    // Change states rapidly
    mockUseSelector.mockReturnValue(true);
    rerender();

    mockUseSelector.mockReturnValue(false);
    rerender();

    mockUseSelector.mockReturnValue(true);
    rerender();

    // Assert
    await waitFor(() => {
      expect(mockSyncSeedPhrases).toHaveBeenCalledTimes(2);
    });
  });
});
