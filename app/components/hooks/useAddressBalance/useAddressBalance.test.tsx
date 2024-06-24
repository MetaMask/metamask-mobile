import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';

import Engine from '../../../core/Engine';
import { Asset } from './useAddressBalance.types';
import useAddressBalance from './useAddressBalance';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockStore = configureMockStore();
const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS_1]: {
            balance: '0x4a7036655fab2ca3',
          },
          [MOCK_ADDRESS_2]: {
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
        selectedAddress: MOCK_ADDRESS_1,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('should render balance from AssetsContractController.getERC20BalanceOf if selectedAddress is different from fromAddress', () => {
    const asset = {
      address: '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95',
      symbol: 'TST',
      decimals: 4,
    };
    renderHook(() => useAddressBalance(asset, MOCK_ADDRESS_2), {
      wrapper: Wrapper,
    });
    expect(mockGetERC20BalanceOf).toBeCalledTimes(1);
  });

  it('should render balance if asset is undefined', () => {
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

  it('should render balance from TokenBalancesController.contractBalances if selectedAddress is same as fromAddress', () => {
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
