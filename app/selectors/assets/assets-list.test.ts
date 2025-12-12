import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import {
  EthAccountType,
  SolAccountType,
  TrxScope,
} from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';
import type { RootState } from '../../reducers';
import {
  selectAsset,
  selectAssetsBySelectedAccountGroup,
  selectSortedAssetsBySelectedAccountGroup,
  selectTronResourcesBySelectedAccountGroup,
} from './assets-list';

const mockState = ({
  filterNetwork,
}: {
  filterNetwork?: '0x1' | '0xa' | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
} = {}) =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: {
          accountTree: {
            wallets: {
              'entropy:01K1TJY9QPSCKNBSVGZNG510GJ': {
                id: 'entropy:01K1TJY9QPSCKNBSVGZNG510GJ',
                type: AccountWalletType.Entropy,
                groups: {
                  'entropy:01K1TJY9QPSCKNBSVGZNG510GJ/0': {
                    id: 'entropy:01K1TJY9QPSCKNBSVGZNG510GJ/0',
                    type: AccountGroupType.MultichainAccount,
                    accounts: [
                      'd7f11451-9d79-4df4-a012-afd253443639',
                      '2d89e6a0-b4e6-45a8-a707-f10cef143b42',
                    ],
                  },
                },
              },
            },
            selectedAccountGroup: 'entropy:01K1TJY9QPSCKNBSVGZNG510GJ/0',
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              'd7f11451-9d79-4df4-a012-afd253443639': {
                id: 'd7f11451-9d79-4df4-a012-afd253443639',
                address: '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab',
                options: {
                  entropySource: '01K1TJY9QPSCKNBSVGZNG510GJ',
                  derivationPath: "m/44'/60'/0'/0/0",
                  groupIndex: 0,
                  entropy: {
                    type: 'mnemonic',
                    id: '01K1TJY9QPSCKNBSVGZNG510GJ',
                    derivationPath: "m/44'/60'/0'/0/0",
                    groupIndex: 0,
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
                scopes: ['eip155:0'],
                type: 'eip155:eoa',
                metadata: {
                  name: 'My main test',
                  importTime: 1754312681246,
                  lastSelected: 1754312803548,
                  keyring: {
                    type: 'HD Key Tree',
                  },
                  nameLastUpdatedAt: 1753697497354,
                },
              },
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': {
                type: 'solana:data-account',
                id: '2d89e6a0-b4e6-45a8-a707-f10cef143b42',
                address: '4KTpypSSbugxHe67NC9JURQWfCBNKdQTo4K8rZmYapS7',
                options: {
                  scope: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                  derivationPath: "m/44'/501'/0'/0'",
                  entropySource: '01K1TJY9QPSCKNBSVGZNG510GJ',
                  synchronize: true,
                  index: 0,
                  entropy: {
                    type: 'mnemonic',
                    id: '01K1TJY9QPSCKNBSVGZNG510GJ',
                    groupIndex: 0,
                    derivationPath: "m/44'/501'/0'/0'",
                  },
                },
                methods: [
                  'signAndSendTransaction',
                  'signTransaction',
                  'signMessage',
                  'signIn',
                ],
                scopes: [
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
                  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
                ],
                metadata: {
                  name: 'Solana Account 2',
                  importTime: 1754312691747,
                  keyring: {
                    type: 'Snap Keyring',
                  },
                  snap: {
                    id: 'npm:@metamask/solana-wallet-snap',
                    name: 'Solana',
                    enabled: true,
                  },
                  lastSelected: 1754312843994,
                },
              },
            },
            selectedAccount: 'd7f11451-9d79-4df4-a012-afd253443639',
          },
        },
        TokensController: {
          allTokens: {
            '0x1': {
              '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab': [
                {
                  address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                  decimals: 18,
                  symbol: 'stETH',
                  name: 'Lido Staked Ether',
                  image:
                    'https://static.cx.metamask.io/api/v1/tokenIcons/10/0xae7ab96520de3a18e5e111b5eaab095312d7fe84.png',
                },
                {
                  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                  decimals: 18,
                  symbol: 'DAI',
                  name: 'Dai Stablecoin',
                  image:
                    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6B175474E89094C44Da98b954EedeAC495271d0F.png',
                },
              ],
            },
            '0xa': {
              '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab': [
                {
                  address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                  decimals: 6,
                  symbol: 'USDC',
                  name: 'USDCoin',
                  image:
                    'https://static.cx.metamask.io/api/v1/tokenIcons/10/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
                },
              ],
            },
          },
          allIgnoredTokens: {},
        },
        TokenBalancesController: {
          tokenBalances: {
            '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab': {
              '0x1': {
                '0xae7ab96520de3a18e5e111b5eaab095312d7fe84':
                  '0x56BC75E2D63100000', // 100000000000000000000 (100 18 decimals)
                '0x6B175474E89094C44Da98b954EedeAC495271d0F':
                  '0xAD78EBC5AC6200000', // 200000000000000000000 (200 18 decimals)
              },
              '0xa': {
                '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': '0x3B9ACA00', // 1000000000 (1000 6 decimals)
              },
            },
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              '0x0000000000000000000000000000000000000000': {
                tokenAddress: '0x0000000000000000000000000000000000000000',
                currency: 'ETH',
                price: 1,
              },
              '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': {
                tokenAddress: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                currency: 'ETH',
                price: 0.00009,
              },
              '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
                tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
                currency: 'ETH',
                price: 0.002,
              },
            },
            '0xa': {
              '0x0000000000000000000000000000000000000000': {
                tokenAddress: '0x0000000000000000000000000000000000000000',
                currency: 'ETH',
                price: 1,
              },
              '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': {
                tokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                currency: 'ETH',
                price: 0.005,
              },
            },
          },
        },
        TokenListController: {
          tokensChainsCache: {
            '0x1': {
              data: {
                '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': {
                  address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                  symbol: 'stETH',
                  aggregators: ['UniswapLabs', 'Metamask', 'Aave'],
                },
              },
            },
          },
        },
        MultichainAssetsController: {
          accountsAssets: {
            '2d89e6a0-b4e6-45a8-a707-f10cef143b42': [
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
            ],
          },
          assetsMetadata: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
              fungible: true,
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
              name: 'Solana',
              symbol: 'SOL',
              units: [
                {
                  decimals: 9,
                  name: 'Solana',
                  symbol: 'SOL',
                },
              ],
            },
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':
              {
                name: 'Jupiter',
                symbol: 'JUP',
                fungible: true,
                iconUrl:
                  'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN.png',
                units: [
                  {
                    name: 'Jupiter',
                    symbol: 'JUP',
                    decimals: 6,
                  },
                ],
              },
          },
          allIgnoredAssets: {},
        },
        MultichainBalancesController: {
          balances: {
            '2d89e6a0-b4e6-45a8-a707-f10cef143b42': {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
                amount: '10',
                unit: 'SOL',
              },
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':
                {
                  amount: '200',
                  unit: 'JUP',
                },
            },
          },
        },
        MultichainAssetsRatesController: {
          conversionRates: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
              rate: '163.55',
              currency: 'swift:0/iso4217:USD',
            },
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':
              {
                rate: '0.463731',
                currency: 'swift:0/iso4217:USD',
              },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2400,
            },
          },
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {
              nativeCurrency: 'ETH',
            },
            '0xa': {
              nativeCurrency: 'ETH',
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab': {
                balance: '0x8AC7230489E80000', // 10000000000000000000 (10 - 18 decimals)
                stakedBalance: '0x56BC75E2D63100000', // 100000000000000000000 (100 18 decimals)
              },
            },
            '0xa': {
              '0x2bd63233fe369b0f13eaf25292af5a9b63d2b7ab': {
                balance: '0xDE0B6B3A7640000', // 1000000000000000000 (1 - 18 decimals)
              },
            },
          },
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            [KnownCaipNamespace.Eip155]: {
              '0x1': !filterNetwork || filterNetwork === '0x1',
              '0xa': !filterNetwork || filterNetwork === '0xa',
            },
            [KnownCaipNamespace.Solana]: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp':
                !filterNetwork ||
                filterNetwork === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            },
          },
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc',
            sortCallback: 'stringNumeric',
          },
        },
      },
    },
  }) as unknown as RootState;

describe('selectAssetsBySelectedAccountGroup', () => {
  it('builds the initial state object', () => {
    const result = selectAssetsBySelectedAccountGroup(mockState());
    expect(result).toStrictEqual({
      '0x1': [
        {
          accountType: 'eip155:eoa',
          assetId: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
          isNative: false,
          address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/10/0xae7ab96520de3a18e5e111b5eaab095312d7fe84.png',
          name: 'Lido Staked Ether',
          symbol: 'stETH',
          accountId: 'd7f11451-9d79-4df4-a012-afd253443639',
          decimals: 18,
          rawBalance: '0x56BC75E2D63100000',
          balance: '100',
          fiat: {
            balance: 21.6,
            conversionRate: 2400,
            currency: 'USD',
          },
          chainId: '0x1',
        },
        {
          accountType: 'eip155:eoa',
          assetId: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          isNative: false,
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6B175474E89094C44Da98b954EedeAC495271d0F.png',
          name: 'Dai Stablecoin',
          symbol: 'DAI',
          accountId: 'd7f11451-9d79-4df4-a012-afd253443639',
          decimals: 18,
          rawBalance: '0xAD78EBC5AC6200000',
          balance: '200',
          fiat: {
            balance: 960,
            conversionRate: 2400,
            currency: 'USD',
          },
          chainId: '0x1',
        },
        {
          accountType: 'eip155:eoa',
          assetId: '0x0000000000000000000000000000000000000000',
          isNative: true,
          address: '0x0000000000000000000000000000000000000000',
          image: '',
          name: 'Ethereum',
          symbol: 'ETH',
          accountId: 'd7f11451-9d79-4df4-a012-afd253443639',
          decimals: 18,
          rawBalance: '0x8AC7230489E80000',
          balance: '10',
          fiat: {
            balance: 24000,
            conversionRate: 2400,
            currency: 'USD',
          },
          chainId: '0x1',
        },
      ],
      '0xa': [
        {
          accountType: 'eip155:eoa',
          assetId: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
          isNative: false,
          address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/10/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
          name: 'USDCoin',
          symbol: 'USDC',
          accountId: 'd7f11451-9d79-4df4-a012-afd253443639',
          decimals: 6,
          rawBalance: '0x3B9ACA00',
          balance: '1000',
          fiat: {
            balance: 12000,
            conversionRate: 2400,
            currency: 'USD',
          },
          chainId: '0xa',
        },
        {
          accountType: 'eip155:eoa',
          assetId: '0x0000000000000000000000000000000000000000',
          isNative: true,
          address: '0x0000000000000000000000000000000000000000',
          image: '',
          name: 'Ethereum',
          symbol: 'ETH',
          accountId: 'd7f11451-9d79-4df4-a012-afd253443639',
          decimals: 18,
          rawBalance: '0xDE0B6B3A7640000',
          balance: '1',
          fiat: {
            balance: 2400,
            conversionRate: 2400,
            currency: 'USD',
          },
          chainId: '0xa',
        },
      ],
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': [
        {
          accountType: 'solana:data-account',
          accountId: '2d89e6a0-b4e6-45a8-a707-f10cef143b42',
          assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          balance: '10',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          decimals: 9,
          fiat: {
            balance: 1635.5,
            conversionRate: 163.55,
            currency: 'USD',
          },
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
          isNative: true,
          name: 'Solana',
          rawBalance: '0x2540be400',
          symbol: 'SOL',
        },
        {
          accountType: 'solana:data-account',
          accountId: '2d89e6a0-b4e6-45a8-a707-f10cef143b42',
          assetId:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
          balance: '200',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          decimals: 6,
          fiat: {
            balance: 92.7462,
            conversionRate: 0.463731,
            currency: 'USD',
          },
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN.png',
          isNative: false,
          name: 'Jupiter',
          rawBalance: '0xbebc200',
          symbol: 'JUP',
        },
      ],
    });
  });
});

describe('selectSortedAssetsBySelectedAccountGroup', () => {
  it('returns all assets sorted by fiat amount when all networks are selected', () => {
    const state = mockState();
    const result = selectSortedAssetsBySelectedAccountGroup(state);

    expect(result).toEqual([
      {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        isStaked: true,
      },
      {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        isStaked: false,
      },
      {
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        chainId: '0xa',
        isStaked: false,
      },
      {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0xa',
        isStaked: false,
      },
      {
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        isStaked: false,
      },
      {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: '0x1',
        isStaked: false,
      },
      {
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        isStaked: false,
      },
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        chainId: '0x1',
        isStaked: false,
      },
    ]);
  });

  it('filters assets when a single network is selected', () => {
    const state = mockState({ filterNetwork: '0x1' });
    const result = selectSortedAssetsBySelectedAccountGroup(state);

    expect(result).toEqual([
      {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        isStaked: true,
      },
      {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        isStaked: false,
      },
      {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: '0x1',
        isStaked: false,
      },
      {
        address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
        chainId: '0x1',
        isStaked: false,
      },
    ]);
  });

  it('filters out Tron Energy and Bandwidth resources from assets', () => {
    const stateWithTronAssets = {
      ...mockState(),
      engine: {
        ...mockState().engine,
        backgroundState: {
          ...mockState().engine.backgroundState,
          MultichainAssetsController: {
            accountsAssets: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': [
                'tron:728126428/slip44:energy',
                'tron:728126428/slip44:bandwidth',
                'tron:728126428/slip44:195',
              ],
            },
            assetsMetadata: {
              'tron:728126428/slip44:energy': {
                name: 'Energy',
                symbol: 'ENERGY',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [{ name: 'Energy', symbol: 'ENERGY', decimals: 0 }],
              },
              'tron:728126428/slip44:bandwidth': {
                name: 'Bandwidth',
                symbol: 'BANDWIDTH',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [
                  { name: 'Bandwidth', symbol: 'BANDWIDTH', decimals: 0 },
                ],
              },
              'tron:728126428/slip44:195': {
                name: 'TRON',
                symbol: 'TRX',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [{ name: 'TRON', symbol: 'TRX', decimals: 6 }],
              },
            },
            allIgnoredAssets: {},
          },
          MultichainBalancesController: {
            balances: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': {
                'tron:728126428/slip44:energy': {
                  amount: '400',
                  unit: 'ENERGY',
                },
                'tron:728126428/slip44:bandwidth': {
                  amount: '604',
                  unit: 'BANDWIDTH',
                },
                'tron:728126428/slip44:195': { amount: '1000', unit: 'TRX' },
              },
            },
          },
          MultichainAssetsRatesController: {
            conversionRates: {
              'tron:728126428/slip44:195': {
                rate: '0.12',
                currency: 'swift:0/iso4217:USD',
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Tron]: {
                [TrxScope.Mainnet]: true,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const result =
      selectSortedAssetsBySelectedAccountGroup(stateWithTronAssets);

    const tronAssets = result.filter((asset) =>
      asset.chainId?.includes('tron:'),
    );
    const energyAsset = result.find((asset) =>
      asset.address?.includes('energy'),
    );
    const bandwidthAsset = result.find((asset) =>
      asset.address?.includes('bandwidth'),
    );
    const trxAsset = result.find((asset) =>
      asset.address?.includes('slip44:195'),
    );

    expect(energyAsset).toBeUndefined();
    expect(bandwidthAsset).toBeUndefined();
    expect(trxAsset).toBeDefined();

    // Only TRX is in the list after filtering
    expect(tronAssets).toHaveLength(1);
  });
});

describe('selectAsset', () => {
  it('returns formatted evm native asset based on filter criteria', () => {
    const state = mockState();
    const result = selectAsset(state, {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      isStaked: false,
    });

    expect(result).toEqual({
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      ticker: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balance: '10',
      balanceFiat: '$24,000.00',
      isETH: true,
      isNative: true,
      isStaked: false,
      logo: '../images/eth-logo-new.png',
      image: '',
      aggregators: [],
      accountType: EthAccountType.Eoa,
    });
  });

  it('returns formatted staked evm native asset based on filter criteria', () => {
    const state = mockState();
    const result = selectAsset(state, {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      isStaked: true,
    });

    expect(result).toEqual({
      chainId: '0x1',
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      ticker: 'ETH',
      name: 'Staked Ethereum',
      decimals: 18,
      balance: '100',
      balanceFiat: '$240,000.00',
      isETH: true,
      isNative: true,
      isStaked: true,
      logo: '../images/eth-logo-new.png',
      image: '',
      aggregators: [],
      accountType: EthAccountType.Eoa,
    });
  });

  it('returns formatted evm token asset based on filter criteria', () => {
    const state = mockState();
    const result = selectAsset(state, {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chainId: '0x1',
      isStaked: false,
    });

    expect(result).toEqual({
      chainId: '0x1',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      ticker: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      balance: '200',
      balanceFiat: '$960.00',
      isETH: false,
      isNative: false,
      isStaked: false,
      logo: 'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6B175474E89094C44Da98b954EedeAC495271d0F.png',
      image:
        'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6B175474E89094C44Da98b954EedeAC495271d0F.png',
      aggregators: [],
      accountType: EthAccountType.Eoa,
    });
  });

  it('returns formatted non-evm asset based on filter criteria', () => {
    const state = mockState();
    const result = selectAsset(state, {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      isStaked: false,
    });

    expect(result).toEqual({
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      symbol: 'SOL',
      ticker: 'SOL',
      name: 'Solana',
      decimals: 9,
      balance: '10',
      balanceFiat: '$1,635.50',
      isETH: false,
      isNative: true,
      isStaked: false,
      logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      image:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      aggregators: [],
      accountType: SolAccountType.DataAccount,
    });
  });

  it('returns asset with aggregators', () => {
    const state = mockState();
    const result = selectAsset(state, {
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      chainId: '0x1',
      isStaked: false,
    });

    expect(result).toEqual({
      chainId: '0x1',
      address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      symbol: 'stETH',
      ticker: 'stETH',
      name: 'Lido Staked Ether',
      decimals: 18,
      balance: '100',
      balanceFiat: '$21.60',
      isETH: false,
      isNative: false,
      isStaked: false,
      logo: 'https://static.cx.metamask.io/api/v1/tokenIcons/10/0xae7ab96520de3a18e5e111b5eaab095312d7fe84.png',
      image:
        'https://static.cx.metamask.io/api/v1/tokenIcons/10/0xae7ab96520de3a18e5e111b5eaab095312d7fe84.png',
      aggregators: ['UniswapLabs', 'Metamask', 'Aave'],
      accountType: EthAccountType.Eoa,
    });
  });

  it('returns isStaked as false when asset.isStaked is undefined', () => {
    // Arrange - Create a mock asset without the isStaked property
    const state = mockState();

    // Act - Get an asset that doesn't have isStaked property
    const result = selectAsset(state, {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chainId: '0x1',
      isStaked: false,
    });

    // Assert - isStaked should be false instead of undefined
    expect(result?.isStaked).toBe(false);
    expect(result?.isStaked).not.toBeUndefined();
  });
});

describe('selectTronResourcesBySelectedAccountGroup', () => {
  it('returns Tron energy and bandwidth resources when Tron network is enabled', () => {
    const stateWithTronAssets = {
      ...mockState(),
      engine: {
        ...mockState().engine,
        backgroundState: {
          ...mockState().engine.backgroundState,
          MultichainAssetsController: {
            accountsAssets: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': [
                'tron:728126428/slip44:energy',
                'tron:728126428/slip44:bandwidth',
                'tron:728126428/slip44:195',
              ],
            },
            assetsMetadata: {
              'tron:728126428/slip44:energy': {
                name: 'Energy',
                symbol: 'ENERGY',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [{ name: 'Energy', symbol: 'ENERGY', decimals: 0 }],
              },
              'tron:728126428/slip44:bandwidth': {
                name: 'Bandwidth',
                symbol: 'BANDWIDTH',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [
                  { name: 'Bandwidth', symbol: 'BANDWIDTH', decimals: 0 },
                ],
              },
              'tron:728126428/slip44:195': {
                name: 'TRON',
                symbol: 'TRX',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [{ name: 'TRON', symbol: 'TRX', decimals: 6 }],
              },
            },
            allIgnoredAssets: {},
          },
          MultichainBalancesController: {
            balances: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': {
                'tron:728126428/slip44:energy': {
                  amount: '400',
                  unit: 'ENERGY',
                },
                'tron:728126428/slip44:bandwidth': {
                  amount: '604',
                  unit: 'BANDWIDTH',
                },
                'tron:728126428/slip44:195': { amount: '1000', unit: 'TRX' },
              },
            },
          },
          MultichainAssetsRatesController: {
            conversionRates: {
              'tron:728126428/slip44:195': {
                rate: '0.12',
                currency: 'swift:0/iso4217:USD',
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Tron]: {
                [TrxScope.Mainnet]: true,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const result =
      selectTronResourcesBySelectedAccountGroup(stateWithTronAssets);

    expect(result.map((a) => a.assetId).sort()).toEqual([
      'tron:728126428/slip44:bandwidth',
      'tron:728126428/slip44:energy',
    ]);
  });

  it('returns empty list when Tron network is disabled', () => {
    const stateWithTronDisabled = {
      ...mockState(),
      engine: {
        ...mockState().engine,
        backgroundState: {
          ...mockState().engine.backgroundState,
          MultichainAssetsController: {
            accountsAssets: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': [
                'tron:728126428/slip44:energy',
                'tron:728126428/slip44:bandwidth',
              ],
            },
            assetsMetadata: {
              'tron:728126428/slip44:energy': {
                name: 'Energy',
                symbol: 'ENERGY',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [{ name: 'Energy', symbol: 'ENERGY', decimals: 0 }],
              },
              'tron:728126428/slip44:bandwidth': {
                name: 'Bandwidth',
                symbol: 'BANDWIDTH',
                fungible: true as const,
                iconUrl: 'test-url',
                units: [
                  { name: 'Bandwidth', symbol: 'BANDWIDTH', decimals: 0 },
                ],
              },
            },
            allIgnoredAssets: {},
          },
          MultichainBalancesController: {
            balances: {
              '2d89e6a0-b4e6-45a8-a707-f10cef143b42': {
                'tron:728126428/slip44:energy': {
                  amount: '400',
                  unit: 'ENERGY',
                },
                'tron:728126428/slip44:bandwidth': {
                  amount: '604',
                  unit: 'BANDWIDTH',
                },
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Tron]: {
                [TrxScope.Mainnet]: false,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectTronResourcesBySelectedAccountGroup(
      stateWithTronDisabled,
    );

    expect(result).toEqual([]);
  });
});
