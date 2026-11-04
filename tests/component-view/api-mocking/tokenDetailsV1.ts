/**
 * HTTP mocks for the memecoin Token Details V1 page.
 *
 * Intercepts the token API (`/v2/assets` and security `/assets`), the price
 * API, and the social holders route. Component view tests cannot mock those
 * modules, so the page has to read them off the network.
 */

import type { CaipAssetType } from '@metamask/utils';
import type { TokenSecurityData } from '@metamask/assets-controllers';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { TOKEN_API_BASE_URL } from '../../../app/components/UI/Assets/watchlist/utils/getTokens';
import {
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../../../app/components/UI/TokenDetails/constants/constants';
import { TOKEN_HOLDERS_FIXTURE } from '../../../app/components/UI/TokenDetails/components/tabs/holders/tokenHolders.fixture';
import {
  buildSecurityData,
  feature,
} from '../../../app/components/UI/TokenDetails/utils/__fixtures__/securityData';
import { PRICE_API_BASE_URL } from '../../../app/constants/urls';
import AppConstants from '../../../app/core/AppConstants';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

export const TOKEN_DETAILS_V1_ADDRESS =
  '0x6982508145454Ce325dDbE47a25d4ec3d2311933';

export const TOKEN_DETAILS_V1_ASSET_ID =
  `eip155:1/erc20:${TOKEN_DETAILS_V1_ADDRESS}` as CaipAssetType;

export const TOKEN_DETAILS_V1_DESCRIPTION =
  'The meme that launched a thousand bags.';

export const TOKEN_DETAILS_V1_AGE_LABEL = '3d';

const THREE_DAYS_SECONDS = 3 * 24 * 60 * 60;

const HOLDER_NAMES = {
  openWhale: 'frogwhale.eth',
  openSecond: 'degenmachine',
  closed: 'tookprofit.eth',
} as const;

export const TOKEN_DETAILS_V1_HOLDER_NAMES = HOLDER_NAMES;

const holderByName = (name: string) => {
  const item = TOKEN_HOLDERS_FIXTURE.items.find(
    (entry) => entry.actor.name === name,
  );
  if (!item) {
    throw new Error(`Missing holders fixture row ${name}`);
  }
  return item;
};

export const tokenDetailsV1OpenHolders = [
  holderByName(HOLDER_NAMES.openWhale),
  holderByName(HOLDER_NAMES.openSecond),
];

export const tokenDetailsV1ClosedHolder = holderByName(HOLDER_NAMES.closed);

export const tokenDetailsV1SecurityData: TokenSecurityData = buildSecurityData({
  resultType: 'Verified',
  created: '2026-09-26T00:00:00.000Z',
  features: [
    feature('VERIFIED_CONTRACT', 'Benign'),
    feature('OWNERSHIP_RENOUNCED', 'Info'),
    feature('IS_MINTABLE', 'Info'),
    feature('CAN_BLACKLIST', 'Info'),
    feature('UNSTABLE_TOKEN_PRICE', 'Warning'),
    feature('LISTED_ON_CENTRALIZED_EXCHANGE', 'Benign'),
  ],
  fees: { buy: 1, sell: 2, transfer: 0, transferFeeMaxAmount: null },
  financialStats: {
    supply: 1_000_000,
    topHolders: [
      { label: 'wallet', name: null, address: '0x1', holdingPercentage: 12.5 },
      { label: 'wallet', name: null, address: '0x2', holdingPercentage: 5.9 },
      {
        label: 'market',
        name: 'Pool',
        address: '0x3',
        holdingPercentage: 70,
      },
    ],
    holdersCount: 100,
    tradeVolume24h: null,
    lockedLiquidityPct: 40,
    markets: [
      {
        marketType: 'uniswap_v2',
        marketName: 'Uniswap',
        pairName: 'PEPE/WETH',
        reserveUSD: 1_240_000,
      },
    ],
  },
  metadata: {
    externalLinks: {
      homepage: 'https://pepe.example',
      twitterPage: 'pepecoin',
      telegramChannelId: 'pepechat',
    },
  },
});

export const tokenDetailsV1MarketData = {
  marketCap: 12_400_000,
  totalVolume: 3_200_000,
  high1d: 2.5,
  low1d: 1.1,
  circulatingSupply: 420_000_000,
  price: 0.00001234,
  usdPrice: 0.00001234,
  pricePercentChange5m: 1.25,
  pricePercentChange1h: -0.5,
  pricePercentChange4h: 3,
  pricePercentChange1d: 12.5,
};

export interface TokenDetailsV1ApiMockOptions {
  /** `false` returns a plain ERC-20 with no launchpad data. */
  launchpad?: boolean;
  /** `false` returns no Blockaid payload for the asset. */
  security?: boolean;
  /** `populated` returns two open holders and one closed position. */
  holders?: 'populated' | 'empty';
}

const buildAssetRecord = (launchpad: boolean) => {
  const launchedAt = Math.floor(Date.now() / 1000) - THREE_DAYS_SECONDS;
  return {
    assetId: TOKEN_DETAILS_V1_ASSET_ID,
    symbol: 'PEPE',
    name: 'Pepe',
    decimals: 18,
    rwaData: null,
    marketData: null,
    launchpad: launchpad ? 'pump.fun' : null,
    launchpadData: launchpad
      ? {
          protocol: 'pump.fun',
          deployer: null,
          launchedAt,
          description: TOKEN_DETAILS_V1_DESCRIPTION,
          bondingCurve: null,
          graduationPercent: null,
          graduationStage: null,
          devHeldPercent: null,
          insiderHeldPercent: null,
          sniperHeldPercent: null,
          holdersCount: 8421,
          top10HeldPercent: null,
        }
      : null,
    holders: { count: 8421 },
  };
};

const priceReply = (uri: string) => {
  if (uri.includes('spot-prices')) {
    return { [TOKEN_DETAILS_V1_ASSET_ID]: tokenDetailsV1MarketData };
  }
  if (uri.includes('ohlcv')) {
    return { data: [], hasNext: false, nextCursor: '' };
  }
  if (uri.includes('historical-prices')) {
    return { prices: [] };
  }
  return {};
};

export const buildTokenDetailsV1RouteParams = (): TokenDetailsRouteParams => ({
  address: TOKEN_DETAILS_V1_ADDRESS,
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  decimals: 18,
  balance: '0',
  image: '',
  logo: '',
  isETH: false,
  isNative: false,
  caipAssetId: TOKEN_DETAILS_V1_ASSET_ID,
  source: TokenDetailsSource.Trending,
});

export function setupTokenDetailsV1ApiMocks(
  options: TokenDetailsV1ApiMockOptions = {},
): void {
  const { launchpad = true, security = true, holders = 'empty' } = options;

  clearAllNockMocks();
  disableNetConnect();

  const tokenApi = nock(TOKEN_API_BASE_URL).persist();
  tokenApi
    .get('/v2/assets')
    .query(true)
    .reply(200, [buildAssetRecord(launchpad)]);
  tokenApi
    .get('/assets')
    .query((query) => query.includeTokenSecurityData === 'true')
    .reply(
      200,
      security
        ? [
            {
              assetId: TOKEN_DETAILS_V1_ASSET_ID,
              securityData: tokenDetailsV1SecurityData,
            },
          ]
        : [],
    );
  tokenApi.get('/assets').query(true).reply(200, []);

  const priceApi = nock(PRICE_API_BASE_URL).persist();
  priceApi.get(/.*/).reply(200, priceReply);
  priceApi.post(/.*/).reply(200, priceReply);

  nock(AppConstants.SOCIAL_API_URL)
    .persist()
    .get(/\/api\/v1\/positions\//)
    .reply(200, {
      items:
        holders === 'populated'
          ? [...tokenDetailsV1OpenHolders, tokenDetailsV1ClosedHolder]
          : [],
      pagination: { hasMore: false },
    });
}

export function clearTokenDetailsV1ApiMocks(): void {
  teardownNock();
}
