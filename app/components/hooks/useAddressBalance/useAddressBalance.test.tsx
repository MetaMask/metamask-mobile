import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import { Asset } from './useAddressBalance.types';
import useAddressBalance from './useAddressBalance';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: '0x4a7036655fab2ca3',
          },
          '0x1': {
            balance: '0x5',
          },
        },
      },
      TokenBalancesController: {
        contractBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
        },
      },
      PreferencesController: {
        selectedAddress: '0x0',
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '30313233-3435-4637-b839-383736353430': {
              address: '0x0',
              id: '30313233-3435-4637-b839-383736353430',
              options: {},
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
            '30313233-3435-4637-b839-383736353431': {
              address: '0x1',
              id: '30313233-3435-4637-b839-383736353431',
              options: {},
              metadata: {
                name: 'Account 2',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              methods: [
                'personal_sign',
                'eth_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '30313233-3435-4637-b839-383736353430',
        },
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

const Wrapper = ({ children }: any) => (
  <Provider store={store}>{children}</Provider>
);

describe('useAddressBalance', () => {
  let mockGetERC20BalanceOf: any;
  beforeEach(() => {
    mockGetERC20BalanceOf = jest
      .fn()
      .mockReturnValue(Promise.resolve(0x0186a0));
    Engine.context.AssetsContractController = {
      getERC20BalanceOf: mockGetERC20BalanceOf,
    };
  });

  it('should render balance from AccountTrackerController.accounts for ETH', () => {
    let res = renderHook(
      () => useAddressBalance({ isETH: true } as Asset, '0x0'),
      {
        wrapper: Wrapper,
      },
    );
    expect(res.result.current.addressBalance).toStrictEqual('5.36385 ETH');
    res = renderHook(() => useAddressBalance({ isETH: true } as Asset, '0x1'), {
      wrapper: Wrapper,
    });
    expect(res.result.current.addressBalance).toStrictEqual('< 0.00001 ETH');
  });

  it('should render balance from AssetsContractController.getERC20BalanceOf if selectedAddress is different from fromAddress', () => {
    const asset = {
      address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
      symbol: 'TST',
      decimals: 4,
    };
    renderHook(() => useAddressBalance(asset, '0x1'), {
      wrapper: Wrapper,
    });
    expect(mockGetERC20BalanceOf).toBeCalledTimes(1);
  });

  it('should render balance if asset is undefined', () => {
    let asset: Asset;
    let res = renderHook(() => useAddressBalance(asset, '0x0'), {
      wrapper: Wrapper,
    });
    expect(res.result.current.addressBalance).toStrictEqual('5.36385 ETH');
    res = renderHook(() => useAddressBalance({ isETH: true } as Asset, '0x1'), {
      wrapper: Wrapper,
    });
    expect(res.result.current.addressBalance).toStrictEqual('< 0.00001 ETH');
  });

  it('should render balance from TokenBalancesController.contractBalances if selectedAddress is same as fromAddress', () => {
    const res = renderHook(
      () =>
        useAddressBalance(
          {
            address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
            symbol: 'TST',
            decimals: 4,
          },
          '0x0',
        ),
      {
        wrapper: Wrapper,
      },
    );
    expect(mockGetERC20BalanceOf).toBeCalledTimes(0);
    expect(res.result.current.addressBalance).toStrictEqual('0.0005 TST');
  });
});
