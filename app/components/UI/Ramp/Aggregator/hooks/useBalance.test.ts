import { toHex } from '@metamask/controller-utils';
import {
  createMockAccountsControllerStateWithSnap,
  MOCK_SOLANA_ACCOUNT,
} from '../../../../../util/test/accountsControllerTestUtils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../../util/test/initial-root-state';
import useBalance from './useBalance';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { hexToBN } from '../../../../../util/number';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectMultichainBalances } from '../../../../../selectors/multichain';

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../../selectors/multichain', () => ({
  selectMultichainBalances: jest.fn(),
}));

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE =
  createMockAccountsControllerStateWithSnap([MOCK_ADDRESS_1]);

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;
const mockSelectMultichainBalances =
  selectMultichainBalances as jest.MockedFunction<
    typeof selectMultichainBalances
  >;

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            [MOCK_ADDRESS_1]: {
              balance: toHex('12345000000000000000'),
            },
          },
          '0x2': {
            [MOCK_ADDRESS_1]: {
              balance: toHex('223456789098765432100'),
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
              price: 0.0005,
            },
          },
        },
      },
      TokenBalancesController: {
        ...backgroundState.TokenBalancesController,
        tokenBalances: {
          [MOCK_ADDRESS_1]: {
            '0x1': {
              '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':
                hexToBN('0x14fb180'),
            },
          },
        } as unknown as TokenBalancesControllerState,
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetowrkChainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      },
      MultichainBalancesController: {
        balances: {
          [MOCK_SOLANA_ACCOUNT.id]: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
              amount: '5.5',
              unit: 'SOL',
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 2000,
          },
        },
      },
    },
  },
};

describe('useBalance', () => {
  it('returns default if not asset is provided', async () => {
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: initialState,
    });

    expect(result.current.balance).toBe(null);
    expect(result.current.balanceFiat).toBe(null);
    expect(result.current.balanceBN).toBe(null);
  });

  it('returns native address balances', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useBalance({
          address: NATIVE_ADDRESS,
          decimals: 18,
        }),
      {
        state: initialState,
      },
    );

    expect(result.current.balance).toBe('12.345');
    expect(result.current.balanceFiat).toBe('$24690.00');
    expect(result.current.balanceBN).toStrictEqual(
      hexToBN(toHex('12345000000000000000')),
    );
  });

  it('returns token address balances', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useBalance({
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
        }),
      {
        state: initialState,
      },
    );

    expect(result.current.balance).toBe('22');
    expect(result.current.balanceFiat).toBe('$22.00');
    expect(result.current.balanceBN).toStrictEqual(hexToBN(toHex('22000000')));
  });

  it('returns non-evm token balances', async () => {
    mockSelectSelectedInternalAccountByScope.mockReturnValue((scope) => {
      if (scope === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
        return {
          ...MOCK_SOLANA_ACCOUNT,
          scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
        };
      }
      return undefined;
    });

    mockSelectMultichainBalances.mockReturnValue({
      [MOCK_SOLANA_ACCOUNT.id]: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
          amount: '5.5',
          unit: 'SOL',
        },
      },
    });

    const { result } = renderHookWithProvider(
      () =>
        useBalance({
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          assetId: 'slip44:501',
          decimals: 8,
        }),
      {
        state: {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                ...initialState.engine.backgroundState.AccountsController,
                internalAccounts: {
                  selectedAccount: MOCK_SOLANA_ACCOUNT.id,
                  accounts: {
                    [MOCK_SOLANA_ACCOUNT.id]: {
                      ...MOCK_SOLANA_ACCOUNT,
                      scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                    },
                  },
                },
              },
              AccountTreeController: {
                accountTree: {
                  wallets: {
                    'entropy:test-wallet': {
                      id: 'entropy:test-wallet',
                      metadata: { name: 'Test Wallet' },
                      groups: {
                        'entropy:test-wallet/0': {
                          id: 'entropy:test-wallet/0',
                          accounts: [MOCK_SOLANA_ACCOUNT.id],
                          metadata: { name: 'Test Group' },
                        },
                      },
                    },
                  },
                  selectedAccountGroup: 'entropy:test-wallet/0',
                },
              },
            },
          },
        },
      },
    );

    expect(result.current.balance).toBe('5.5 SOL');
    expect(result.current.balanceFiat).toBe(undefined);
    expect(result.current.balanceBN).toBe(undefined);
  });
});
