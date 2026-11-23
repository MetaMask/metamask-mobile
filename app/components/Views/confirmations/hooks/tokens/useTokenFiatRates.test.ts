import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { TokenFiatRateRequest, useTokenFiatRates } from './useTokenFiatRates';

jest.mock('../../../../../util/address', () => ({
  toChecksumAddress: jest.fn((address) => address),
}));

const CHAIN_ID_1_MOCK = '0x123';
const CHAIN_ID_2_MOCK = '0x456';
const ADDRESS_1_MOCK = '0x789';
const ADDRESS_2_MOCK = '0xabc';
const POLYGON_PUSD_ADDRESS_MOCK = '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb';
const PRICE_1_MOCK = 2;
const PRICE_2_MOCK = 3;
const TICKER_1_MOCK = 'USD';
const TICKER_2_MOCK = 'EUR';
const CONVERSION_RATE_1_MOCK = 4;
const CONVERSION_RATE_2_MOCK = 5;
const USD_RATE_1_MOCK = 6;
const USD_RATE_2_MOCK = 7;

// Native assets used purely to seed the migrated currency-rate/market-data
// selectors (see assets-migration.ts): decimal(CHAIN_ID_1_MOCK) == 291,
// decimal(CHAIN_ID_2_MOCK) == 1110.
const NATIVE_ASSET_ID_1_MOCK = 'eip155:291/slip44:60';
const NATIVE_ASSET_ID_2_MOCK = 'eip155:1110/slip44:60';
const TOKEN_ASSET_ID_1_MOCK = `eip155:291/erc20:${ADDRESS_1_MOCK}`;
const TOKEN_ASSET_ID_2_MOCK = `eip155:1110/erc20:${ADDRESS_2_MOCK}`;

function runHook({ requests }: { requests: TokenFiatRateRequest[] }) {
  return renderHookWithProvider(() => useTokenFiatRates(requests), {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          // Any non-'usd' currency preserves the pre-migration test's intent
          // of exercising the non-USD conversionRate path.
          AssetsController: {
            selectedCurrency: 'eur' as const,
            assetsInfo: {
              [NATIVE_ASSET_ID_1_MOCK]: {
                type: 'native' as const,
                symbol: TICKER_1_MOCK,
                name: TICKER_1_MOCK,
                decimals: 18,
              },
              [NATIVE_ASSET_ID_2_MOCK]: {
                type: 'native' as const,
                symbol: TICKER_2_MOCK,
                name: TICKER_2_MOCK,
                decimals: 18,
              },
              [TOKEN_ASSET_ID_1_MOCK]: {
                type: 'erc20' as const,
                symbol: 'TOKEN1',
                name: 'Token 1',
                decimals: 18,
              },
              [TOKEN_ASSET_ID_2_MOCK]: {
                type: 'erc20' as const,
                symbol: 'TOKEN2',
                name: 'Token 2',
                decimals: 18,
              },
            },
            assetsBalance: {},
            assetsPrice: {
              [NATIVE_ASSET_ID_1_MOCK]: {
                assetPriceType: 'fungible' as const,
                price: CONVERSION_RATE_1_MOCK,
                usdPrice: USD_RATE_1_MOCK,
                lastUpdated: 0,
              },
              [NATIVE_ASSET_ID_2_MOCK]: {
                assetPriceType: 'fungible' as const,
                price: CONVERSION_RATE_2_MOCK,
                usdPrice: USD_RATE_2_MOCK,
                lastUpdated: 0,
              },
              // Fiat price such that dividing by the native conversion rate
              // reproduces PRICE_1_MOCK / PRICE_2_MOCK (native-denominated).
              [TOKEN_ASSET_ID_1_MOCK]: {
                assetPriceType: 'fungible' as const,
                price: PRICE_1_MOCK * CONVERSION_RATE_1_MOCK,
                usdPrice: PRICE_1_MOCK * CONVERSION_RATE_1_MOCK,
                lastUpdated: 0,
              },
              [TOKEN_ASSET_ID_2_MOCK]: {
                assetPriceType: 'fungible' as const,
                price: PRICE_2_MOCK * CONVERSION_RATE_2_MOCK,
                usdPrice: PRICE_2_MOCK * CONVERSION_RATE_2_MOCK,
                lastUpdated: 0,
              },
            },
          },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID_1_MOCK]: {
                nativeCurrency: TICKER_1_MOCK,
              },
              [CHAIN_ID_2_MOCK]: {
                nativeCurrency: TICKER_2_MOCK,
              },
            },
          },
        },
      },
    },
  }).result.current;
}

describe('useTokenFiatRates', () => {
  it('returns fiat rates calculated from price and conversion rate', () => {
    const result = runHook({
      requests: [
        {
          address: ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ],
    });

    expect(result).toEqual([
      PRICE_1_MOCK * CONVERSION_RATE_1_MOCK,
      PRICE_2_MOCK * CONVERSION_RATE_2_MOCK,
    ]);
  });

  it('returns undefined if token price not found', () => {
    const result = runHook({
      requests: [
        {
          address: 'InvalidAddress' as never,
          chainId: CHAIN_ID_1_MOCK,
        },
      ],
    });

    expect(result).toEqual([undefined]);
  });

  it('returns fixed exchange rate for stablecoin when currency is USD', () => {
    const result = runHook({
      requests: [
        {
          address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          chainId: CHAIN_IDS.ARBITRUM,
          currency: 'usd',
        },
      ],
    });

    expect(result).toEqual([1]);
  });

  it('returns fixed exchange rate for Polygon pUSD when currency is USD', () => {
    const result = runHook({
      requests: [
        {
          address: POLYGON_PUSD_ADDRESS_MOCK,
          chainId: CHAIN_IDS.POLYGON,
          currency: 'usd',
        },
      ],
    });

    expect(result).toEqual([1]);
  });

  it('returns USD conversion rates if currency is USD', () => {
    const result = runHook({
      requests: [
        {
          address: ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
          currency: 'usd',
        },
        {
          address: ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
          currency: 'usd',
        },
      ],
    });

    expect(result).toEqual([
      PRICE_1_MOCK * USD_RATE_1_MOCK,
      PRICE_2_MOCK * USD_RATE_2_MOCK,
    ]);
  });
});
