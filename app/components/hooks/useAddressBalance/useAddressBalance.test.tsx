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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Wrapper = ({ children }: any) => (
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
    let asset: Asset;
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
});
