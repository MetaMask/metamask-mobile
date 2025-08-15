import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import { Asset } from './useAddressBalance.types';
import useAddressBalance from './useAddressBalance';
import backgroundState from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { SolScope } from '@metamask/keyring-api';
import type BN5 from 'bnjs5';
import { mockNetworkState } from '../../../util/test/network';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';

jest.mock('../../../util/networks', () => ({
  isPerDappSelectedNetworkEnabled: jest.fn(),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
  safeToChecksumAddress: jest.requireActual('../../../util/networks')
    .safeToChecksumAddress,
}));
const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: jest.fn(),
    },
  },
}));

const mockStore = configureMockStore();
const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: {
              balance: '0x4a7036655fab2ca3',
            },
            [MOCK_ADDRESS_2]: {
              balance: '0x5',
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_1]: {
            '0x1': {
              '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
            },
          },
        },
      },
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS_1,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {},
      },
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://goerli.lineascan.build',
        }),
      },
    },
  },
};
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

const Wrapper = ({ children }: React.PropsWithChildren) => (
  <Provider store={store}>{children}</Provider>
);

describe('useAddressBalance', () => {
  let mockGetERC20BalanceOf: (
    address: string,
    selectedAddress: string,
    networkClientId?: string | undefined,
  ) => Promise<BN5>;

  beforeEach(() => {
    mockGetERC20BalanceOf = jest
      .fn()
      .mockReturnValue(Promise.resolve(0x0186a0));
    //@ts-expect-error - for test purposes is not needed to add the other properties of AssetsContractController
    Engine.context.AssetsContractController = {
      getERC20BalanceOf: mockGetERC20BalanceOf,
    };

    // Set up NetworkController mock for all tests
    (
      Engine.context as unknown as {
        NetworkController: { findNetworkClientIdByChainId: jest.Mock };
      }
    ).NetworkController = {
      findNetworkClientIdByChainId: jest.fn(),
    };
  });

  it('render balance from AccountTrackerController.accounts for ETH', () => {
    let res = renderHook(
      () => useAddressBalance({ isETH: true } as Asset, MOCK_ADDRESS_1),
      {
        wrapper: Wrapper,
      },
    );
    expect(res.result.current.addressBalance).toStrictEqual('5.36385 ETH');
    res = renderHook(
      () => useAddressBalance({ isETH: true } as Asset, MOCK_ADDRESS_2),
      {
        wrapper: Wrapper,
      },
    );
    expect(res.result.current.addressBalance).toStrictEqual('< 0.00001 ETH');
  });

  it('render balance from AssetsContractController.getERC20BalanceOf if balance from TokenBalancesController.contractBalances is not available', async () => {
    const asset = {
      // Different asset
      address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136123',
      symbol: 'TST2',
      decimals: 4,
    };

    (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
    );

    renderHook(() => useAddressBalance(asset, MOCK_ADDRESS_2), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetERC20BalanceOf).toBeCalledTimes(1);
  });

  it('render balance if asset is undefined', () => {
    let asset: Asset | undefined;
    let res = renderHook(() => useAddressBalance(asset, MOCK_ADDRESS_1), {
      wrapper: Wrapper,
    });
    expect(res.result.current.addressBalance).toStrictEqual('5.36385 ETH');
    res = renderHook(
      () => useAddressBalance({ isETH: true } as Asset, MOCK_ADDRESS_2),
      {
        wrapper: Wrapper,
      },
    );
    expect(res.result.current.addressBalance).toStrictEqual('< 0.00001 ETH');
  });

  it('render balance from TokenBalancesController.contractBalances if selectedAddress is same as fromAddress', () => {
    const res = renderHook(
      () =>
        useAddressBalance(
          {
            address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
            symbol: 'TST',
            decimals: 4,
          },
          MOCK_ADDRESS_1,
        ),
      {
        wrapper: Wrapper,
      },
    );
    expect(mockGetERC20BalanceOf).toBeCalledTimes(0);
    expect(res.result.current.addressBalance).toStrictEqual('0.0005 TST');
  });

  describe('networkClientId selection logic', () => {
    const mockIsRemoveGlobalNetworkSelectorEnabled =
      isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
        typeof isRemoveGlobalNetworkSelectorEnabled
      >;
    const mockFindNetworkClientIdByChainId = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();

      // Use the existing NetworkController mock and update its method
      (
        Engine.context as unknown as {
          NetworkController: { findNetworkClientIdByChainId: jest.Mock };
        }
      ).NetworkController.findNetworkClientIdByChainId =
        mockFindNetworkClientIdByChainId;
    });

    it('uses networkClientIdByChainId when global network selector is removed', async () => {
      const networkClientIdByChainId = 'polygon-mainnet-client';
      const providedNetworkClientId = 'mainnet-client';
      const chainId = '0x89'; // Polygon

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        networkClientIdByChainId,
      );

      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136999',
        symbol: 'MATIC',
        decimals: 18,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith(chainId);
      expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
        '0x326836Cc6Cd09b5aA59B81A7f72f25fCc0136999', // Checksum address
        MOCK_ADDRESS_1,
        networkClientIdByChainId, // Should use networkClientIdByChainId
      );
    });

    it('uses provided networkClientId when global network selector is not removed', async () => {
      const networkClientIdByChainId = 'polygon-mainnet-client';
      const providedNetworkClientId = 'mainnet-client';
      const chainId = '0x89'; // Polygon

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        networkClientIdByChainId,
      );

      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136888',
        symbol: 'USDC',
        decimals: 6,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // With the fix, findNetworkClientIdByChainId should NOT be called when feature flag is false
      expect(mockFindNetworkClientIdByChainId).not.toHaveBeenCalled();
      expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
        '0x326836cc6Cd09B5Aa59B81a7F72f25fcc0136888', // Checksum address
        MOCK_ADDRESS_1,
        providedNetworkClientId, // Should use provided networkClientId
      );
    });

    it('calls findNetworkClientIdByChainId with correct chainId when feature flag is enabled', async () => {
      const chainId = '0xa86a'; // Avalanche
      const providedNetworkClientId = 'avalanche-client';

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        'avalanche-mainnet-client',
      );

      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136777',
        symbol: 'AVAX',
        decimals: 18,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith(chainId);
      expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledTimes(1);
    });

    it('handles undefined chainId gracefully', async () => {
      const providedNetworkClientId = 'mainnet-client';

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        'mainnet-fallback-client',
      );

      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136666',
        symbol: 'ETH',
        decimals: 18,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            undefined,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // With the fix, findNetworkClientIdByChainId should NOT be called when chainId is undefined
      expect(mockFindNetworkClientIdByChainId).not.toHaveBeenCalled();
      expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
        '0x326836cc6cd09B5AA59B81A7f72f25fCc0136666', // Checksum address
        MOCK_ADDRESS_1,
        providedNetworkClientId, // Should fallback to provided networkClientId
      );
    });

    it('falls back to provided networkClientId when findNetworkClientIdByChainId returns null', async () => {
      const chainId = '0x89';
      const providedNetworkClientId = 'mainnet-client';

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue(null);

      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136555',
        symbol: 'NULL',
        decimals: 18,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // With the fix, when networkClientIdByChainId is null, it should fallback to providedNetworkClientId
      expect(mockGetERC20BalanceOf).toHaveBeenCalledWith(
        '0x326836cc6cD09B5aa59b81a7F72f25FCC0136555', // Checksum address
        MOCK_ADDRESS_1,
        providedNetworkClientId, // Should fallback to provided networkClientId instead of null
      );
    });

    it('verifies feature flag is called each time for different assets', async () => {
      const chainId = '0x1';
      const providedNetworkClientId = 'mainnet-client';

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        'ethereum-mainnet-client',
      );

      const asset1 = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136444',
        symbol: 'DAI',
        decimals: 18,
      };

      const asset2 = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136333',
        symbol: 'USDT',
        decimals: 6,
      };

      (mockGetERC20BalanceOf as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(0x0186a0), 50)),
      );

      // First asset
      renderHook(
        () =>
          useAddressBalance(
            asset1,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Second asset
      renderHook(
        () =>
          useAddressBalance(
            asset2,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalledTimes(2);
      expect(mockGetERC20BalanceOf).toHaveBeenCalledTimes(2);

      // Both calls should use providedNetworkClientId since feature flag is false
      expect(mockGetERC20BalanceOf).toHaveBeenNthCalledWith(
        1,
        '0x326836cc6cd09B5aA59B81A7f72f25FCc0136444', // Checksum address
        MOCK_ADDRESS_1,
        providedNetworkClientId,
      );
      expect(mockGetERC20BalanceOf).toHaveBeenNthCalledWith(
        2,
        '0x326836cc6CD09B5AA59b81a7F72f25FCc0136333', // Checksum address
        MOCK_ADDRESS_1,
        providedNetworkClientId,
      );
    });

    it('does not call NetworkController methods when balance exists in contractBalances', () => {
      const chainId = '0x1';
      const providedNetworkClientId = 'mainnet-client';

      mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      mockFindNetworkClientIdByChainId.mockReturnValue(
        'ethereum-mainnet-client',
      );

      // This asset already has balance in mockInitialState
      const asset = {
        address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
        symbol: 'TST',
        decimals: 4,
      };

      const res = renderHook(
        () =>
          useAddressBalance(
            asset,
            MOCK_ADDRESS_1,
            false,
            chainId,
            providedNetworkClientId,
          ),
        {
          wrapper: Wrapper,
        },
      );

      // Should not call NetworkController methods since balance exists
      expect(mockFindNetworkClientIdByChainId).not.toHaveBeenCalled();
      expect(mockGetERC20BalanceOf).not.toHaveBeenCalled();
      expect(res.result.current.addressBalance).toStrictEqual('0.0005 TST');
    });
  });
});
