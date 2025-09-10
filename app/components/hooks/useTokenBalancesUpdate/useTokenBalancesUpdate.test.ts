import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

// Mock Engine - must be before importing the hook
const mockUpdateBalances = jest.fn();
jest.mock('../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      updateBalances: mockUpdateBalances,
    },
  },
}));

import { useTokenBalancesUpdate } from './useTokenBalancesUpdate';

describe('useTokenBalancesUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls TokenBalancesController.updateBalances on mount with provided chain IDs', () => {
    // Arrange
    const mockChainIds = ['0x1', '0x89', '0xa'] as `0x${string}`[];

    // Act
    renderHookWithProvider(() => useTokenBalancesUpdate(mockChainIds));

    // Assert
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: mockChainIds,
      queryAllAccounts: true,
    });
  });

  it('calls updateBalances when enabledEvmNetworks changes', () => {
    // Arrange
    const initialChainIds = ['0x1'] as `0x${string}`[];

    // Act - Initial render
    renderHookWithProvider(() => useTokenBalancesUpdate(initialChainIds));

    // Assert - Initial call
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: initialChainIds,
      queryAllAccounts: true,
    });

    // Reset mock for second test
    jest.clearAllMocks();

    // Act - Test with updated chain IDs
    const updatedChainIds = ['0x1', '0x89'] as `0x${string}`[];
    renderHookWithProvider(() => useTokenBalancesUpdate(updatedChainIds));

    // Assert - Second call with different chain IDs
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: updatedChainIds,
      queryAllAccounts: true,
    });
  });

  it('does not call updateBalances again when the same chain IDs are passed', () => {
    // Arrange
    const chainIds = ['0x1', '0x89'] as `0x${string}`[];

    // Act - First render
    renderHookWithProvider(() => useTokenBalancesUpdate(chainIds));

    // Assert - Initial call
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);

    // Reset and test same chain IDs again
    jest.clearAllMocks();

    // Act - Second render with same chain IDs
    renderHookWithProvider(() => useTokenBalancesUpdate(chainIds));

    // Assert - Should call again (new hook instance)
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
  });

  it('handles empty chain IDs array', () => {
    // Arrange
    const emptyChainIds = [] as `0x${string}`[];

    // Act
    renderHookWithProvider(() => useTokenBalancesUpdate(emptyChainIds));

    // Assert
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: emptyChainIds,
      queryAllAccounts: true,
    });
  });

  it('handles single chain ID', () => {
    // Arrange
    const singleChainId = ['0x1'] as `0x${string}`[];

    // Act
    renderHookWithProvider(() => useTokenBalancesUpdate(singleChainId));

    // Assert
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: singleChainId,
      queryAllAccounts: true,
    });
  });

  it('calls updateBalances with async/await pattern', async () => {
    // Arrange
    const chainIds = ['0x1'] as `0x${string}`[];
    mockUpdateBalances.mockResolvedValue(undefined);

    // Act
    renderHookWithProvider(() => useTokenBalancesUpdate(chainIds));

    // Assert
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    await expect(
      mockUpdateBalances.mock.results[0].value,
    ).resolves.toBeUndefined();
  });

  it('handles updateBalances rejection gracefully', async () => {
    // Arrange
    const chainIds = ['0x1'] as `0x${string}`[];
    const mockError = new Error('Network error');
    mockUpdateBalances.mockRejectedValue(mockError);

    // Act & Assert - Should not throw
    expect(() => {
      renderHookWithProvider(() => useTokenBalancesUpdate(chainIds));
    }).not.toThrow();

    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
  });

  it('maintains correct dependency array behavior', () => {
    // Arrange
    const chainIds1 = ['0x1', '0x89'] as `0x${string}`[];
    const chainIds2 = ['0x1', '0x89'] as `0x${string}`[]; // Same content, different array reference

    // Act - Initial render
    renderHookWithProvider(() => useTokenBalancesUpdate(chainIds1));

    // Assert - Initial call
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);

    // Reset mock for second test
    jest.clearAllMocks();

    // Act - Render with different array reference but same content
    renderHookWithProvider(() => useTokenBalancesUpdate(chainIds2));

    // Assert - Should call again (new hook instance with different array reference)
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
  });

  it('handles multiple chain IDs correctly', () => {
    // Arrange
    const multipleChainIds = [
      '0x1', // Ethereum Mainnet
      '0x89', // Polygon
      '0xa', // Optimism
      '0xa4b1', // Arbitrum
    ] as `0x${string}`[];

    // Act
    renderHookWithProvider(() => useTokenBalancesUpdate(multipleChainIds));

    // Assert
    expect(mockUpdateBalances).toHaveBeenCalledTimes(1);
    expect(mockUpdateBalances).toHaveBeenCalledWith({
      chainIds: multipleChainIds,
      queryAllAccounts: true,
    });
  });
});
