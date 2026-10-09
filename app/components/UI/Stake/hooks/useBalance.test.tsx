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
import { RootState } from '../../../../reducers';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockSelectedAccountId =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount;
const mockSelectedAccount =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
    mockSelectedAccountId
  ];

// The staked (pooled-staking vault) token address, whose ERC-20 balance is
// surfaced as `stakedBalance` on the native asset — only on mainnet and the
// Hoodi testnet (see `STAKED_TOKEN_ASSET_IDS_TO_FILTER` in assets-migration.ts).
const STAKED_TOKEN_ADDRESS = '0x4FEF9D741011476750A243aC70b9789a63dd47Df';

const MAINNET_NATIVE_ASSET_ID = 'eip155:1/slip44:60';
const MAINNET_STAKED_ASSET_ID = `eip155:1/erc20:${STAKED_TOKEN_ADDRESS}`;
// Hoodi testnet — the other chain where staking (and thus stakedBalance) is
// supported by the migration selector. Used to exercise the `chainId`
// override behavior of the hook.
const HOODI_CHAIN_ID_HEX = '0x88bb0';
const HOODI_NATIVE_ASSET_ID = 'eip155:560048/slip44:60';
const HOODI_STAKED_ASSET_ID = `eip155:560048/erc20:${STAKED_TOKEN_ADDRESS}`;

const initialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTreeController: {
        accountTree: {
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
        selectedAccountGroup: 'keyring:test-wallet/ethereum',
      },
      AssetsController: {
        selectedCurrency: 'usd' as const,
        assetsInfo: {
          [MAINNET_NATIVE_ASSET_ID]: {
            type: 'native' as const,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
          },
          [MAINNET_STAKED_ASSET_ID]: {
            type: 'erc20' as const,
            symbol: 'osETH',
            name: 'Staked ETH',
            decimals: 18,
          },
          [HOODI_NATIVE_ASSET_ID]: {
            type: 'native' as const,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
          },
          [HOODI_STAKED_ASSET_ID]: {
            type: 'erc20' as const,
            symbol: 'osETH',
            name: 'Staked ETH',
            decimals: 18,
          },
        },
        assetsBalance: {
          [mockSelectedAccountId]: {
            [MAINNET_NATIVE_ASSET_ID]: { amount: '12345678.90987654321' },
            [MAINNET_STAKED_ASSET_ID]: {
              amount: '5.791332670714232',
            },
            [HOODI_NATIVE_ASSET_ID]: { amount: '22345678.90987654321' },
            [HOODI_STAKED_ASSET_ID]: {
              amount: '5.791332670714232',
            },
          },
        },
        assetsPrice: {
          [MAINNET_NATIVE_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            price: 3200,
            usdPrice: 3200,
            lastUpdated: 1717334400000,
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
    expect(result.current.stakedBalanceWei).toBe(
      MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0].assets,
    ); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('5.79133 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(18532.26454); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$18,532.26'); // Intl-formatted fiat
  });

  it('returns default values when no selected address and no account data', async () => {
    const { result } = renderHookWithProvider(() => useBalance(), {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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
              selectedAccountGroup: 'keyring:test-wallet/ethereum',
            },
            AssetsController: {
              selectedCurrency: 'usd' as const,
              assetsInfo: {
                [MAINNET_NATIVE_ASSET_ID]: {
                  type: 'native' as const,
                  symbol: 'ETH',
                  name: 'Ethereum',
                  decimals: 18,
                },
                [MAINNET_STAKED_ASSET_ID]: {
                  type: 'erc20' as const,
                  symbol: 'osETH',
                  name: 'Staked ETH',
                  decimals: 18,
                },
              },
              assetsBalance: {
                [mockSelectedAccountId]: {
                  [MAINNET_NATIVE_ASSET_ID]: {
                    amount: '12345678.90987654321',
                  },
                  [MAINNET_STAKED_ASSET_ID]: {
                    amount: '99999.99999',
                  },
                },
              },
              assetsPrice: {
                [MAINNET_NATIVE_ASSET_ID]: {
                  assetPriceType: 'fungible' as const,
                  price: 3200,
                  usdPrice: 3200,
                  lastUpdated: 1717334400000,
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

    expect(result.current.stakedBalanceWei).toBe(
      MOCK_GET_POOLED_STAKES_API_RESPONSE_HIGH_ASSETS_AMOUNT.accounts[0].assets,
    ); // No staked assets
    expect(result.current.formattedStakedBalanceETH).toBe('99999.99999 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(319999999.968); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$319,999,999.97'); // Intl-formatted fiat
  });

  it('returns correct stake amounts and fiat values when chainId is overridden', async () => {
    const { result } = renderHookWithProvider(
      () => useBalance(HOODI_CHAIN_ID_HEX),
      {
        state: initialState,
      },
    );

    expect(result.current.balanceETH).toBe('22345678.90988');
    expect(result.current.balanceWei.toString()).toBe(
      '22345678909876543210000000',
    );
    expect(result.current.balanceFiat).toBe('$71506172511.60'); // Fiat balance
    expect(result.current.balanceFiatNumber).toBe(71506172511.6); // Fiat number balance
    expect(result.current.stakedBalanceWei).toBe(
      MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0].assets,
    );
    expect(result.current.formattedStakedBalanceETH).toBe('5.79133 ETH'); // Formatted ETH balance
    expect(result.current.stakedBalanceFiatNumber).toBe(18532.26454); // Staked balance in fiat number
    expect(result.current.formattedStakedBalanceFiat).toBe('$18532.26'); // Fallback formatting when selector has no staked asset for chain
  });
});
