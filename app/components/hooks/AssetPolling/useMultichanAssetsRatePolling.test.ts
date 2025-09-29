import { renderHook } from '@testing-library/react-hooks';
import useMultichainAssetsRatePolling from './useMultichainAssetsRatePolling';
import Engine from '../../../core/Engine';

// Mock Engine with MultichainAssetsRatesController
jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainAssetsRatesController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

describe('useMultichainAssetsRatePolling', () => {
  const mockStartPolling = jest.fn();
  const mockStopPollingByPollingToken = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();

    // Setup mock implementations
    mockStartPolling.mockImplementation(() => 'mock-polling-token');
    mockStopPollingByPollingToken.mockImplementation(() => undefined);

    // Apply mocks to Engine context
    (Engine.context.MultichainAssetsRatesController.startPolling as jest.Mock) =
      mockStartPolling;
    (Engine.context.MultichainAssetsRatesController
      .stopPollingByPollingToken as jest.Mock) = mockStopPollingByPollingToken;
  });

  it('starts polling with provided accountId on mount', () => {
    // Arrange
    const accountId = 'test-account-id-123';

    // Act
    renderHook(() => useMultichainAssetsRatePolling({ accountId }));

    // Assert
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStartPolling).toHaveBeenCalledWith({ accountId });
    expect(mockStopPollingByPollingToken).not.toHaveBeenCalled();
  });

  it('stops polling on unmount', () => {
    // Arrange
    const accountId = 'test-account-id-123';

    // Act
    const { unmount } = renderHook(() =>
      useMultichainAssetsRatePolling({ accountId }),
    );

    // Assert initial polling started
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStartPolling).toHaveBeenCalledWith({ accountId });

    // Act - unmount the hook
    unmount();

    // Assert polling stopped
    expect(mockStopPollingByPollingToken).toHaveBeenCalledTimes(1);
    expect(mockStopPollingByPollingToken).toHaveBeenCalledWith(
      'mock-polling-token',
    );
  });

  it('restarts polling when accountId changes', () => {
    // Arrange
    const initialAccountId = 'account-1';
    const newAccountId = 'account-2';

    // Act
    const { rerender } = renderHook(
      ({ accountId }) => useMultichainAssetsRatePolling({ accountId }),
      { initialProps: { accountId: initialAccountId } },
    );

    // Assert initial polling
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStartPolling).toHaveBeenCalledWith({
      accountId: initialAccountId,
    });

    // Act - change accountId
    rerender({ accountId: newAccountId });

    // Assert old polling stopped and new polling started
    expect(mockStopPollingByPollingToken).toHaveBeenCalledTimes(1);
    expect(mockStopPollingByPollingToken).toHaveBeenCalledWith(
      'mock-polling-token',
    );
    expect(mockStartPolling).toHaveBeenCalledTimes(2);
    expect(mockStartPolling).toHaveBeenNthCalledWith(2, {
      accountId: newAccountId,
    });
  });

  it('handles empty accountId gracefully', () => {
    // Arrange
    const accountId = '';

    // Act
    renderHook(() => useMultichainAssetsRatePolling({ accountId }));

    // Assert - should still start polling even with empty accountId
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStartPolling).toHaveBeenCalledWith({ accountId: '' });
  });

  it('handles multiple rapid accountId changes correctly', () => {
    // Arrange
    const accountIds = ['account-1', 'account-2', 'account-3'];

    // Act
    const { rerender } = renderHook(
      ({ accountId }) => useMultichainAssetsRatePolling({ accountId }),
      { initialProps: { accountId: accountIds[0] } },
    );

    // Change accountId multiple times
    accountIds.slice(1).forEach((newAccountId) => {
      rerender({ accountId: newAccountId });
    });

    // Assert
    // Should have started polling for each accountId
    expect(mockStartPolling).toHaveBeenCalledTimes(accountIds.length);
    accountIds.forEach((accountId, index) => {
      expect(mockStartPolling).toHaveBeenNthCalledWith(index + 1, {
        accountId,
      });
    });

    // Should have stopped polling for all but the last accountId
    expect(mockStopPollingByPollingToken).toHaveBeenCalledTimes(
      accountIds.length - 1,
    );
  });

  it('maintains polling when same accountId is provided', () => {
    // Arrange
    const accountId = 'same-account-id';

    // Act
    const { rerender } = renderHook(
      ({ accountId: hookAccountId }) =>
        useMultichainAssetsRatePolling({ accountId: hookAccountId }),
      { initialProps: { accountId } },
    );

    // Re-render with same accountId
    rerender({ accountId });

    // Assert - should not restart polling for same accountId
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStopPollingByPollingToken).not.toHaveBeenCalled();
  });

  it('handles controller methods being bound correctly', () => {
    // Arrange - Verify that controller methods are properly bound
    const accountId = 'test-account-id';

    // Act
    renderHook(() => useMultichainAssetsRatePolling({ accountId }));

    // Assert - Methods should be called (proving they were bound correctly)
    expect(mockStartPolling).toHaveBeenCalledTimes(1);
    expect(mockStartPolling).toHaveBeenCalledWith({ accountId });
  });

  it('passes correct polling token to stop method', () => {
    // Arrange
    const customToken = 'custom-polling-token-xyz';
    mockStartPolling.mockReturnValue(customToken);
    const accountId = 'test-account-id';

    // Act
    const { unmount } = renderHook(() =>
      useMultichainAssetsRatePolling({ accountId }),
    );
    unmount();

    // Assert
    expect(mockStopPollingByPollingToken).toHaveBeenCalledWith(customToken);
  });

  describe('accountId format variations', () => {
    const accountIdVariations = [
      'simple-id',
      'account-with-dashes-123',
      'AccountWithMixedCase',
      '0x1234567890abcdef',
      'very-long-account-id-with-many-characters-to-test-edge-cases-123456789',
    ] as const;

    it.each(accountIdVariations)(
      'handles accountId format: %s',
      (accountId) => {
        // Act
        renderHook(() => useMultichainAssetsRatePolling({ accountId }));

        // Assert
        expect(mockStartPolling).toHaveBeenCalledWith({ accountId });
      },
    );
  });
});
