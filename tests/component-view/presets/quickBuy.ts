import { initialStateBridge } from './bridge';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import {
  USDC_DEST,
  USDT_DEST,
} from '../../../app/components/UI/Bridge/_mocks_/bridgeViewTestConstants';

export const SELECTED_QUICK_BUY_ADDRESS =
  '0x0000000000000000000000000000000000000001';
const QUICK_BUY_ACCOUNT_ID = 'acc-1';
/** 10 ETH in wei — enough for $10–$250 quick-amount pills at $2000/ETH. */
const TEN_ETH_HEX = '0x8ac7230489e80000';

const usdcAssetId = `eip155:1/erc20:${USDC_DEST.address.toLowerCase()}`;
const usdtAssetId = `eip155:1/erc20:${USDT_DEST.address.toLowerCase()}`;

const erc20AssetInfo = (symbol: string, name: string, decimals: number) => ({
  type: 'erc20' as const,
  symbol,
  name,
  decimals,
});

const erc20AssetPrice = () => ({
  assetPriceType: 'fungible' as const,
  id: 'usd-stable',
  price: 1,
  usdPrice: 1,
  lastUpdated: 1700000000000,
});

const nativeEthBalance = (hex: string): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              [SELECTED_QUICK_BUY_ADDRESS]: {
                address: SELECTED_QUICK_BUY_ADDRESS,
                balance: hex,
              },
            },
          },
        },
        AssetsController: {
          assetsBalance: {
            'acc-1': {
              'eip155:1/slip44:60': {
                amount: hex === '0x0' ? '0' : '10',
              },
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

export const quickBuyZeroEthOverrides = (): DeepPartial<RootState> =>
  nativeEthBalance('0x0');

export const quickBuySellableUsdcOverrides = (): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        AssetsController: {
          assetsBalance: {
            [QUICK_BUY_ACCOUNT_ID]: {
              [usdcAssetId]: { amount: '100' },
            },
          },
          assetsInfo: {
            [usdcAssetId]: erc20AssetInfo(
              USDC_DEST.symbol,
              USDC_DEST.name ?? 'USD Coin',
              USDC_DEST.decimals,
            ),
          },
          assetsPrice: {
            [usdcAssetId]: erc20AssetPrice(),
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              [USDC_DEST.address]: {
                tokenAddress: USDC_DEST.address,
                currency: 'ETH',
                price: 0.0005,
              },
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

export const quickBuyUsdtPayWithOverrides = (): DeepPartial<RootState> =>
  ({
    engine: {
      backgroundState: {
        TokensController: {
          allTokens: {
            '0x1': {
              [SELECTED_QUICK_BUY_ADDRESS]: [
                {
                  address: USDT_DEST.address,
                  symbol: USDT_DEST.symbol,
                  name: USDT_DEST.name,
                  decimals: USDT_DEST.decimals,
                  image: '',
                },
              ],
            },
          },
        },
        AssetsController: {
          assetsBalance: {
            [QUICK_BUY_ACCOUNT_ID]: {
              [usdtAssetId]: { amount: '100' },
            },
          },
          assetsInfo: {
            [usdtAssetId]: erc20AssetInfo(
              USDT_DEST.symbol,
              USDT_DEST.name ?? 'Tether USD',
              USDT_DEST.decimals,
            ),
          },
          assetsPrice: {
            [usdtAssetId]: erc20AssetPrice(),
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              [USDT_DEST.address]: {
                tokenAddress: USDT_DEST.address,
                currency: 'ETH',
                price: 0.0005,
              },
            },
          },
        },
      },
    },
  }) as unknown as DeepPartial<RootState>;

interface InitialStateQuickBuyOptions {
  deterministicFiat?: boolean;
}

/**
 * Bridge preset plus ETH balance / rates so Quick Buy has a priced pay-with
 * token and mainnet enabled as src+dest.
 */
export const initialStateQuickBuy = (options?: InitialStateQuickBuyOptions) =>
  initialStateBridge({ deterministicFiat: options?.deterministicFiat ?? true })
    .withBridgeRecommendedQuoteEvmSimple()
    .withOverrides({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              bridgeConfig: {
                priceImpactThreshold: {
                  gasless: 0.2,
                  normal: 0.05,
                  warning: 0.05,
                  error: 0.25,
                },
              },
              bridgeConfigV2: {
                priceImpactThreshold: {
                  gasless: 0.2,
                  normal: 0.05,
                  warning: 0.05,
                  error: 0.25,
                },
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                [SELECTED_QUICK_BUY_ADDRESS]: {
                  address: SELECTED_QUICK_BUY_ADDRESS,
                  balance: TEN_ETH_HEX,
                },
              },
            },
          },
          AssetsController: {
            selectedCurrency: 'usd',
            assetsBalance: {
              'acc-1': {
                'eip155:1/slip44:60': { amount: '10' },
              },
            },
            assetsInfo: {
              'eip155:1/slip44:60': {
                type: 'native',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
              },
            },
            assetsPrice: {
              'eip155:1/slip44:60': {
                assetPriceType: 'fungible',
                id: 'eth',
                price: 2000,
                usdPrice: 2000,
                lastUpdated: 1700000000000,
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
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
                '0x2105': true,
              },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
