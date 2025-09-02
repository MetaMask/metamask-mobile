import {
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT,
} from '../__mocks__/stakeMockData';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useBalance from './useBalance';
import { toHex } from '@metamask/controller-utils';
import { RootState } from '../../../../reducers';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockSelectedAccount =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount
  ];

const initialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTreeController: {
        accountTree: {
          selectedAccountGroup: 'keyring:test-wallet/ethereum',
          wallets: {
            'keyring:test-wallet': {
              groups: {
                'keyring:test-wallet/ethereum': {
                  accounts: [mockSelectedAccount.id],
                },
              },
            },
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: {
              balance: toHex('12345678909876543210000000'),
              stakedBalance: toHex(
                MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0].assets,
              ),
            },
          },
          '0x4268': {
            [MOCK_ADDRESS_1]: {
              balance: toHex('22345678909876543210000000'),
              stakedBalance: toHex(
                MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0].assets,
              ),
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 3200,
          },
        },
      },
    },
  },
};

describe('useBalance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('returns balance and fiat values based on account and pooled stake data', async () => {
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: initialState,
    });

    expect(result.current.balanceETH).toBe('12345678.90988'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe(
      '12345678909876543210000000',
    ); // Wei balance
    expect(result.current.balanceFiat).toBe('$39506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(39506172511.6); // Fiat number balance
    expect(result.current.stakedBalanceWei).toBe('5791332670714232000'); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('5.79133 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(18532.26454); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$18532.26'); //
  });

  it('returns default values when no selected address and no account data', async () => {
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {
                ETH: {
                  conversionRate: 3200,
                },
              },
            },
          },
        },
      },
    });

    expect(result.current.balanceETH).toBe('0'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe('0'); // Wei balance
    expect(result.current.balanceFiat).toBe('$0.00'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(0); // Fiat number balance
  });

  it('returns correct stake amounts and fiat values based on account with high amount of assets', async () => {
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: 'keyring:test-wallet/ethereum',
                wallets: {
                  'keyring:test-wallet': {
                    groups: {
                      'keyring:test-wallet/ethereum': {
                        accounts: [mockSelectedAccount.id],
                      },
                    },
                  },
                },
              },
            },
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  [MOCK_ADDRESS_1]: {
                    balance: toHex('12345678909876543210000000'),
                    stakedBalance: toHex(
                      MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT
                        .accounts[0].assets,
                    ),
                  },
                },
              },
            },
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {
                ETH: {
                  conversionRate: 3200,
                },
              },
            },
          },
        },
      },
    });

    expect(result.current.balanceETH).toBe('12345678.90988'); // ETH balance
    expect(result.current.balanceWei.toString()).toBe(
      '12345678909876543210000000',
    );
    expect(result.current.balanceFiat).toBe('$39506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(39506172511.6); // Fiat number balance

    expect(result.current.stakedBalanceWei).toBe('99999999990000000000000'); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('99999.99999 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(319999999.968); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$319999999.96'); // should round to floor
  });

  it('returns correct stake amounts and fiat values when chainId is overriden', async () => {
    const { result } = renderHookWithProvider(() => useBalance('0x4268'), {
      state: initialState,
    });

    expect(result.current.balanceETH).toBe('22345678.90988');
    expect(result.current.balanceWei.toString()).toBe(
      '22345678909876543210000000',
    );
    expect(result.current.balanceFiat).toBe('$71506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(71506172511.6); // Fiat number balance
    expect(result.current.stakedBalanceWei).toBe('5791332670714232000');
    expect(result.current.formattedStakedBalanceETH).toBe('5.79133 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(18532.26454); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$18532.26'); //
  });
});
