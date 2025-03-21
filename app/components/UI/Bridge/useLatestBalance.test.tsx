import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { useLatestBalance } from './useLatestBalance';
import { getProviderByChainId } from '../../../util/notifications/methods/common';
import { BigNumber, constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
// Mock dependencies
jest.mock('../../../util/notifications/methods/common', () => ({
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
    getBalance: jest.fn().mockResolvedValue(BigNumber.from('1000000000000000000')),
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
  };

  const initialState = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: '1',
          networkConfigurations: {
            '0x1': {
              chainId: '0x1',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
            },
          },
          providerConfig: {
            chainId: '0x1',
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountTrackerController: {
          accounts: {
            '0x1234567890123456789012345678901234567890': {
              balance: '0x0',
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: '0x1234567890123456789012345678901234567890',
                name: 'Account 1',
                balance: '0x0',
              },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2000,
            },
          },
        },
        PreferencesController: {
          ipfsGateway: 'https://dweb.link/ipfs/',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getProviderByChainId as jest.Mock).mockReturnValue(mockProvider);
  });

  it('should fetch native token balance when token address is zero address', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
            chainId: '0x1' as Hex,
          },
        ),
      { state: initialState },
    );

    await waitFor(() => {
      expect(mockProvider.getBalance).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000000000000000'),
      });
    });
  });

  it('should fetch ERC20 token balance', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: '0x1234567890123456789012345678901234567890',
            decimals: 6,
            chainId: '0x1' as Hex,
          },
        ),
      { state: initialState },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        displayBalance: '1.0',
        atomicBalance: BigNumber.from('1000000'),
      });
    });
  });

  it('should not fetch balance when chainId is CAIP format', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: constants.AddressZero,
            decimals: 18,
            chainId: 'eip155:1',
          },
        ),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should not fetch balance when token address is missing', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            decimals: 18,
            chainId: '0x1' as Hex,
          },
        ),
      { state: initialState },
    );

    expect(mockProvider.getBalance).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('should return cached balance when latest balance is not yet fetched', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useLatestBalance(
          {
            address: '0x1234567890123456789012345678901234567890',
            decimals: 6,
            chainId: '0x1' as Hex,
            balance: '5.5',
          },
        ),
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
});
