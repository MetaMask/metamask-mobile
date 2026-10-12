import type {
  TokenSecurityData,
  TokenSecurityFeature,
} from '@metamask/assets-controllers';

/**
 * Payloads captured from `token.api.cx.metamask.io/assets`, trimmed to the
 * fields the Security surfaces read.
 *
 * Real responses rather than invented ones, because the derivation's hardest
 * cases are all shapes nobody would think to make up: an `Info` feature that
 * is bad news sitting beside an `Info` feature that is good, a `Warning`
 * verdict where every contract check passes, a chain that reports no fees at
 * all.
 */

export const feature = (
  featureId: string,
  type: string,
): TokenSecurityFeature => ({
  featureId,
  type,
  description: `${featureId} description`,
});

export const buildSecurityData = (
  overrides: Partial<TokenSecurityData> = {},
): TokenSecurityData =>
  ({
    resultType: 'Verified',
    maliciousScore: '0',
    features: [],
    fees: { buy: 0, sell: 0, transfer: 0, transferFeeMaxAmount: null },
    financialStats: {
      supply: 1_000_000,
      topHolders: [],
      holdersCount: 0,
      tradeVolume24h: null,
      lockedLiquidityPct: null,
      markets: [],
    },
    metadata: {
      externalLinks: {
        homepage: null,
        twitterPage: null,
        telegramChannelId: null,
      },
    },
    created: '2026-09-26T00:00:00.000Z',
    ...overrides,
  }) as TokenSecurityData;

/**
 * Coinbase Wrapped XRP on Base.
 *
 * `Verified`, and the reason `Info` can never be trusted for polarity:
 * `IS_MINTABLE` and `CAN_BLACKLIST` arrive with the same type as
 * `OWNERSHIP_RENOUNCED`.
 */
export const CBXRP_VERIFIED = buildSecurityData({
  resultType: 'Verified',
  features: [
    feature('HIGH_TRADE_VOLUME', 'Benign'),
    feature('HIGH_REPUTATION_TOKEN', 'Benign'),
    feature('SIGNIFICANT_USD_RESERVES', 'Benign'),
    feature('IS_MINTABLE', 'Info'),
    feature('CAN_BLACKLIST', 'Info'),
    feature('OWNERSHIP_RENOUNCED', 'Info'),
    feature('PROXY_CONTRACT', 'Info'),
    feature('VERIFIED_CONTRACT', 'Benign'),
    feature('EXTERNAL_FUNCTIONS', 'Info'),
  ],
  financialStats: {
    supply: 1_000_000,
    topHolders: [
      { label: 'wallet', name: null, address: '0x1', holdingPercentage: 12.5 },
      { label: 'wallet', name: null, address: '0x2', holdingPercentage: 5.9 },
    ],
    holdersCount: 12_900,
    tradeVolume24h: null,
    lockedLiquidityPct: 100,
    markets: [
      {
        marketType: 'DEX',
        marketName: 'Aerodrome',
        pairName: 'CBXRP / WETH',
        reserveUSD: 560_000,
      },
      {
        marketType: 'DEX',
        marketName: 'Uniswap',
        pairName: 'CBXRP / USDC',
        reserveUSD: 120_000,
      },
    ],
  },
});

/**
 * Ethos on Solana.
 *
 * `Warning` on six flags, none of which any contract check watches, and no
 * fees at all — the token that proves the pill's count cannot be derived from
 * the checks.
 */
export const ETHOS_WARNING = buildSecurityData({
  resultType: 'Warning',
  features: [
    feature('LOW_SNIPERS_PERCENTAGE', 'Benign'),
    feature('HIGH_DEV_PERCENTAGE', 'Warning'),
    feature('LOW_REPUTATION_CREATOR', 'Warning'),
    feature('LOW_INITIAL_SNIPERS_PERCENTAGE', 'Benign'),
    feature('WASH_TRADING', 'Warning'),
    feature('LOW_INSIDERS_PERCENTAGE', 'Benign'),
    feature('SNIPE_AT_MINT', 'Warning'),
    feature('HIGH_TRADE_VOLUME', 'Benign'),
    feature('INSUFFICIENT_LOCKED_LIQUIDITY', 'Warning'),
    feature('FAKE_VOLUME', 'Warning'),
    feature('LOW_BUNDLERS_PERCENTAGE', 'Benign'),
    feature('OWNERSHIP_RENOUNCED', 'Benign'),
  ],
  fees: {
    buy: null,
    sell: null,
    transfer: null,
    transferFeeMaxAmount: null,
  } as unknown as TokenSecurityData['fees'],
  financialStats: {
    supply: 1_000_000_000,
    topHolders: [],
    holdersCount: 4_689,
    tradeVolume24h: null,
    lockedLiquidityPct: 0,
    markets: [],
  },
  created: '',
});
