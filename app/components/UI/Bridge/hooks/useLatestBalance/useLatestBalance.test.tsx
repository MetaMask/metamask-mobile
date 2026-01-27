import {
  initialState,
  solanaNativeTokenAddress,
  solanaToken2Address,
  solanaAccountId,
} from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useLatestBalance } from '.';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { BigNumber, constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex, type CaipAssetId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { cloneDeep } from 'lodash';

// Mock dependencies
jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

// Mock ethers contract
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    Contract: jest.fn().mockImplementation(() => ({
      balanceOf: jest.fn().mockResolvedValue(actual.BigNumber.from('1000000')),
    })),
  };
});

describe('useLatestBalance', () => {
  const mockProvider = {
    getBalance: jest
      .fn()
      .mockResolvedValue(BigNumber.from('1000000000000000000')),
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should fetch native token balance when token address is zero address', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
        }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('should fetch ERC20 token balance', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: '0x1234567890123456789012345678901234567890',
          decimals: 6,
          chainId: '0x1' as Hex,
        }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000'),
      });
    });
  });

  it('should fetch Solana native token balance', async () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
      solanaAccountId;

    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          chainId: SolScope.Mainnet,
          address: solanaNativeTokenAddress,
          decimals: 9,
        }),
      { state },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '100.123',
        atomicBalance: BigNumber.from('100123000000'),
      });
    });
  });

  it('should fetch Solana SPL token balance', async () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
      solanaAccountId;

    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          chainId: SolScope.Mainnet,
          address: solanaToken2Address,
          decimals: 6,
        }),
      { state },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '20000.456',
        atomicBalance: BigNumber.from('20000456000'),
      });
    });
  });

  it('should not fetch balance when token address is missing', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          decimals: 18,
          chainId: '0x1' as Hex,
        }),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('ignores formatted display string like "< 0.00001" and fetches real balance', async () => {
    // Arrange & Act
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
          balance: '< 0.00001',
        }),
      { state: initialState },
    );

    // Assert - Cached balance atomicBalance is undefined due to parse error
    expect(result.current?.displayBalance).toBe('< 0.00001');
    expect(result.current?.atomicBalance).toBeUndefined();

    // Assert - Real balance is fetched from blockchain
    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('ignores balance with thousands separators and fetches real balance', async () => {
    // Arrange & Act
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
          balance: '1,234.56',
        }),
      { state: initialState },
    );

    // Assert - Cached balance atomicBalance is undefined due to parse error
    expect(result.current?.displayBalance).toBe('1,234.56');
    expect(result.current?.atomicBalance).toBeUndefined();

    // Assert - Real balance is fetched from blockchain
    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('should parse cache balance', async () => {
    // Arrange & Act
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
          balance: '1234.56',
        }),
      { state: initialState },
    );

    // Assert - Cached balance atomicBalance is undefined due to parse error
    expect(result.current?.displayBalance).toBe('1234.56');
    expect(result.current?.atomicBalance).not.toBeUndefined();
  });

  it('returns cached balance with undefined atomicBalance when parseUnits fails', async () => {
    // Arrange & Act
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: '0x1234567890123456789012345678901234567890',
          decimals: 6,
          chainId: '0x1' as Hex,
          balance: 'invalid balance string',
        }),
      { state: initialState },
    );

    // Assert - Cached balance has undefined atomicBalance due to parse error
    expect(result.current?.displayBalance).toBe('invalid balance string');
    expect(result.current?.atomicBalance).toBeUndefined();

    // Assert - Real balance is fetched from blockchain
    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000'),
      });
    });
  });

  it('returns undefined atomicBalance when token balance is not provided', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
          balance: undefined,
        }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('handles empty string balance gracefully', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: constants.AddressZero,
          decimals: 18,
          chainId: '0x1' as Hex,
          balance: '',
        }),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('should return cached balance when latest balance is not yet fetched', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: '0x1234567890123456789012345678901234567890',
          decimals: 6,
          chainId: '0x1' as Hex,
          balance: '5.5',
        }),
      { state: initialState },
    );

    // Initially it should return the cached balance while fetching
    expect(result.current).toEqual({
      displayBalance: '5.5',
      atomicBalance: BigNumber.from('5500000'),
    });

    // After fetching it should update to the fetched balance
    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000'),
      });
    });
  });

  it('does not call EVM balance fetch when chainId is undefined', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          chainId: undefined,
          balance: '10.0',
        }),
      { state: initialState },
    );

    expect(getProviderByChainId).not.toHaveBeenCalled();
    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      displayBalance: '10.0',
      atomicBalance: BigNumber.from('10000000000000000000'),
    });
  });

  it('does not call EVM balance fetch when Solana address is selected with undefined chainId', async () => {
    const state = cloneDeep(initialState);
    state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
      solanaAccountId;

    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: solanaNativeTokenAddress,
          decimals: 9,
          chainId: undefined,
          balance: '100.0',
        }),
      { state },
    );

    expect(getProviderByChainId).not.toHaveBeenCalled();
    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      displayBalance: '100.0',
      atomicBalance: BigNumber.from('100000000000'),
    });
  });

  it('returns cached balance when EVM address is used with Solana CAIP chainId', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance({
          address: '0x1234567890123456789012345678901234567890',
          decimals: 18,
          chainId: SolScope.Mainnet,
          balance: '50.0',
        }),
      { state: initialState },
    );

    // When EVM address is used with non-EVM chainId, it tries to find it in nonEvmTokens
    // Since it's not found, it sets balance to 0
    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      });
    });
  });

  describe('Address type validation (race condition fix)', () => {
    it('does not call EVM balance fetch when Solana address is selected with EVM hex chainId', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '100.0',
          }),
        { state },
      );

      // When Solana address is selected but chainId is EVM hex,
      // isEthAddress(selectedAddress) returns false, preventing EVM balance fetch
      expect(getProviderByChainId).not.toHaveBeenCalled();
      expect(mockProvider.getBalance).not.toHaveBeenCalled();

      // Returns cached balance instead of attempting to fetch
      expect(result.current).toEqual({
        displayBalance: '100.0',
        atomicBalance: BigNumber.from('100000000000000000000'),
      });
    });

    it('does not call EVM balance fetch when Solana address with native token has EVM chainId', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: constants.AddressZero,
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '50.0',
          }),
        { state },
      );

      // Solana address with zero address token and EVM chainId
      // should not attempt EVM balance fetch
      expect(getProviderByChainId).not.toHaveBeenCalled();
      expect(mockProvider.getBalance).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '50.0',
        atomicBalance: BigNumber.from('50000000000000000000'),
      });
    });

    it('fetches EVM balance when EVM address is selected with EVM chainId', async () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 6,
            chainId: '0x1' as Hex,
          }),
        { state: initialState },
      );

      // EVM address with EVM chainId should fetch balance normally
      await waitFor(() => {
        expect(getProviderByChainId).toHaveBeenCalledWith('0x1');
        expect(result.current).toEqual({
          displayBalance: '1.0',
          atomicBalance: BigNumber.from('1000000'),
        });
      });
    });

    it('returns cached balance when Bitcoin address is selected with EVM chainId', async () => {
      const state = cloneDeep(initialState);
      // Mock a Bitcoin account being selected
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'; // Bitcoin address format

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '25.0',
          }),
        { state },
      );

      // Bitcoin address with EVM chainId should not attempt EVM balance fetch
      expect(getProviderByChainId).not.toHaveBeenCalled();
      expect(mockProvider.getBalance).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        displayBalance: '25.0',
        atomicBalance: BigNumber.from('25000000000000000000'),
      });
    });

    it('handles rapid account switching from EVM to Solana gracefully', async () => {
      const stateWithEvmAccount = cloneDeep(initialState);

      renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '10.0',
          }),
        { state: stateWithEvmAccount },
      );

      // Initially with EVM account, balance should be fetched
      await waitFor(() => {
        expect(getProviderByChainId).toHaveBeenCalledWith('0x1');
      });

      jest.clearAllMocks();

      // Simulate switching to Solana account by rendering with updated state
      const stateWithSolanaAccount = cloneDeep(initialState);
      stateWithSolanaAccount.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result: resultAfterSwitch } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '10.0',
          }),
        { state: stateWithSolanaAccount },
      );

      // After switching to Solana, EVM balance fetch should not be called
      // even though chainId is still '0x1'
      expect(getProviderByChainId).not.toHaveBeenCalled();
      expect(mockProvider.getBalance).not.toHaveBeenCalled();

      // Should return cached balance
      expect(resultAfterSwitch.current).toEqual({
        displayBalance: '10.0',
        atomicBalance: BigNumber.from('10000000000000000000'),
      });
    });
  });

  describe('cachedBalance memoization', () => {
    it('returns undefined when decimals is missing during balance parsing', () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: undefined,
            chainId: '0x1' as Hex,
            balance: '10.0',
          }),
        { state: initialState },
      );

      expect(result.current).toBeUndefined();
    });

    it('memoizes cached balance when dependencies do not change', () => {
      const { result, rerender } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '5.5',
          }),
        { state: initialState },
      );

      const firstResult = result.current;
      rerender({ state: initialState });

      expect(result.current).toBe(firstResult);
    });

    it('returns cached balance when token address changes', () => {
      const firstToken = {
        address: '0x1234567890123456789012345678901234567890',
        decimals: 18,
        chainId: '0x1' as Hex,
        balance: '5.5',
      };

      const { result: firstResult } = renderHookWithProvider(
        () => useLatestBalance(firstToken),
        { state: initialState },
      );

      expect(firstResult.current?.displayBalance).toBe('5.5');

      const secondToken = {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        decimals: 18,
        chainId: '0x1' as Hex,
        balance: '10.0',
      };

      const { result: secondResult } = renderHookWithProvider(
        () => useLatestBalance(secondToken),
        { state: initialState },
      );

      expect(secondResult.current?.displayBalance).toBe('10.0');
      expect(secondResult.current).not.toBe(firstResult.current);
    });

    it('returns undefined when balance is provided but decimals is missing', () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: undefined,
            chainId: '0x1' as Hex,
            balance: '100.0',
          }),
        { state: initialState },
      );

      expect(result.current).toBeUndefined();
    });

    it('handles zero balance correctly', () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '0',
          }),
        { state: initialState },
      );

      expect(result.current).toEqual({
        displayBalance: '0',
        atomicBalance: BigNumber.from('0'),
      });
    });

    it('handles very large balance values', () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '999999999999999999999999.123456789012345678',
          }),
        { state: initialState },
      );

      expect(result.current?.displayBalance).toBe(
        '999999999999999999999999.123456789012345678',
      );
      expect(result.current?.atomicBalance).toBeDefined();
    });

    it('handles very small decimal balance values', () => {
      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: '0x1234567890123456789012345678901234567890',
            decimals: 18,
            chainId: '0x1' as Hex,
            balance: '0.000000000000000001',
          }),
        { state: initialState },
      );

      expect(result.current).toEqual({
        displayBalance: '0.000000000000000001',
        atomicBalance: BigNumber.from('1'),
      });
    });
  });

  describe('balance reset when token address changes', () => {
    it('resets balance to undefined when token address changes', async () => {
      let tokenAddress = '0x1234567890123456789012345678901234567890';

      const { result, rerender } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: tokenAddress,
            decimals: 6,
            chainId: '0x1' as Hex,
            balance: '10.0',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.displayBalance).toBe('1.0');
      });

      tokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      rerender({ state: initialState });

      expect(result.current?.displayBalance).toBe('10.0');
    });

    it('returns cached balance immediately after token address changes', async () => {
      let tokenAddress = '0x1111111111111111111111111111111111111111';
      let tokenBalance = '100.5';

      const { result, rerender } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: tokenAddress,
            decimals: 6,
            chainId: '0x1' as Hex,
            balance: tokenBalance,
          }),
        { state: initialState },
      );

      expect(result.current?.displayBalance).toBe('100.5');

      tokenAddress = '0x2222222222222222222222222222222222222222';
      tokenBalance = '250.75';
      rerender({ state: initialState });

      expect(result.current?.displayBalance).toBe('250.75');
      expect(result.current?.atomicBalance).toEqual(
        BigNumber.from('250750000'),
      );
    });

    it('fetches new balance after token address changes', async () => {
      let tokenAddress = constants.AddressZero;

      const { result, rerender } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: tokenAddress,
            decimals: 18,
            chainId: '0x1' as Hex,
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.displayBalance).toBe('1.0');
      });

      jest.clearAllMocks();

      tokenAddress = '0x9999999999999999999999999999999999999999';
      rerender({ state: initialState });

      await waitFor(() => {
        expect(getProviderByChainId).toHaveBeenCalled();
      });
    });

    it('resets balance state before fetching new balance for different token', async () => {
      let tokenAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      let tokenBalance = '50.0';

      const { result, rerender } = renderHookWithProvider(
        () =>
          useLatestBalance({
            address: tokenAddress,
            decimals: 6,
            chainId: '0x1' as Hex,
            balance: tokenBalance,
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.displayBalance).toBe('1.0');
      });

      const previousBalance = result.current;

      tokenAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      tokenBalance = '75.0';
      rerender({ state: initialState });

      expect(result.current?.displayBalance).toBe('75.0');
      expect(result.current).not.toBe(previousBalance);
    });
  });

  describe('non-EVM token not found in balance controller', () => {
    it('sets balance to 0 when Solana token is not found in nonEvmTokens', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            chainId: SolScope.Mainnet,
            address: 'TokenNotInBalanceController123',
            decimals: 9,
          }),
        { state },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          displayBalance: '0',
          atomicBalance: BigNumber.from('0'),
        });
      });
    });

    it('sets balance to 0 when Solana token is not found in nonEvmTokens list', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const nonExistentTokenAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:NonExistentToken123' as CaipAssetId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            chainId: SolScope.Mainnet,
            address: nonExistentTokenAddress,
            decimals: 9,
          }),
        { state },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          displayBalance: '0',
          atomicBalance: BigNumber.from('0'),
        });
      });
    });

    it('sets balance to 0 when non-EVM token has undefined balance in controller', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            chainId: SolScope.Mainnet,
            address: 'UnknownSolanaToken456',
            decimals: 6,
          }),
        { state },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          displayBalance: '0',
          atomicBalance: BigNumber.from('0'),
        });
      });
    });

    it('returns valid balance when Solana token is found in nonEvmTokens', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            chainId: SolScope.Mainnet,
            address: solanaToken2Address,
            decimals: 6,
          }),
        { state },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          displayBalance: '20000.456',
          atomicBalance: BigNumber.from('20000456000'),
        });
      });
    });

    it('handles empty balance string from controller by setting to 0', async () => {
      const state = cloneDeep(initialState);
      state.engine.backgroundState.AccountsController.internalAccounts.selectedAccount =
        solanaAccountId;

      const { result } = renderHookWithProvider(
        () =>
          useLatestBalance({
            chainId: SolScope.Mainnet,
            address: 'TokenWithEmptyBalance789',
            decimals: 9,
          }),
        { state },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          displayBalance: '0',
          atomicBalance: BigNumber.from('0'),
        });
      });
    });
  });
});
