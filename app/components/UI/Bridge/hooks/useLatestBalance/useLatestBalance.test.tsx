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
import { Hex } from '@metamask/utils';
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

    // Should not call EVM provider methods when chainId is CAIP (Solana)
    expect(getProviderByChainId).not.toHaveBeenCalled();
    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      displayBalance: '50.0',
      atomicBalance: BigNumber.from('50000000000000000000'),
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
});
