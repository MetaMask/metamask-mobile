import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Hex, numberToHex } from '@metamask/utils';
import { ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import {
  OnchainTradeParams,
  PredictMarketStatus,
  PredictPositionStatus,
  PredictSportsLeague,
  Side,
  type PredictCategory,
  type PredictMarket,
  type PredictPosition,
  PredictActivity,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictMarketGame,
} from '../../types';
import { getRecurrence } from '../../utils/format';
import {
  buildGameData,
  getEventLeague,
  mapApiTeamToPredictTeam,
  type TeamLookup,
} from '../../utils/gameParser';
import {
  isDrawCapableLeague,
  isMoneylineLikeMarketType,
  SUPPORTED_SPORTS_LEAGUES,
} from '../../constants/sports';
import type {
  GetMarketsParams,
  OrderPreview,
  PredictFees,
  PreviewOrderParams,
  SearchMarketsParams,
} from '../types';
import {
  ClobAuthDomain,
  DEFAULT_CLOB_BASE_URL,
  DEFAULT_GROUP_KEY,
  EIP712Domain,
  GROUP_ORDER,
  SPORTS_MARKET_TYPE_PRIORITIES,
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS_V2,
  MSG_TO_SIGN,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
  ROUNDING_CONFIG,
  SLIPPAGE_BUY,
  SLIPPAGE_SELL,
  SPORTS_MARKET_TYPE_TO_GROUP,
} from './constants';
import {
  ApiKeyCreds,
  ClobFeeDetails,
  ClobHeaders,
  ClobMarketInfo,
  COLLATERAL_TOKEN_DECIMALS,
  ContractConfig,
  L2HeaderArgs,
  OrderSummary,
  PolymarketApiEvent,
  PolymarketApiActivity,
  PolymarketApiEventsKeysetResponse,
  PolymarketApiMarket,
  PolymarketApiTeam,
  PolymarketPosition,
  TickSize,
  OrderBook,
} from './types';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../../constants/errors';
import { PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG } from '../../constants/flags';
import { PredictFeeCollection } from '../../types/flags';
import { roundToFiveDecimals } from '../../utils/orders';
import { getMinAmountReceivedWithSlippage } from './protocol/slippage';

export { SPORTS_MARKET_TYPE_TO_GROUP, GROUP_ORDER } from './constants';

/**
 * Parse a fetch `Response` body as JSON, raising a contextual error when the
 * body is not valid JSON. Without this wrapper the bare
 * `await response.json()` call only surfaces "JSON Parse error: Unexpected
 * character: <" with no clue which endpoint returned HTML, which masks the
 * underlying problem (e.g. an upstream proxy/error page reaching the client).
 */
async function parseJsonOrThrow<T>(
  response: Response,
  url: string,
): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (parseError) {
    const snippet = text.slice(0, 200).replace(/\s+/gu, ' ');
    DevLogger.log('Polymarket: non-JSON response from endpoint', {
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bodySnippet: snippet,
    });
    throw new Error(
      `Polymarket fetch returned non-JSON (status ${response.status}) from ${url}: ${snippet}`,
    );
  }
}

export const getPolymarketEndpoints = () => ({
  GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
  CLOB_ENDPOINT: DEFAULT_CLOB_BASE_URL,
  DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
  CRYPTO_PRICE_ENDPOINT: 'https://polymarket.com/api/crypto/crypto-price',
  CRYPTO_PRICE_HISTORY_ENDPOINT:
    'https://polymarket.com/api/crypto/price-history',
  GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
  HOMEPAGE_CAROUSEL_ENDPOINT: 'https://polymarket.com/api/homepage/carousel',
  CLOB_RELAYER:
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? 'https://predict.dev-api.cx.metamask.io'
      : 'https://predict.api.cx.metamask.io',
});

const FOUR_HOUR_SERIES_SLUG_PATTERN = /(?:^|-)4h(?:-|$)/u;

const getSeriesRecurrence = (
  series: PolymarketApiEvent['series'][number],
): string =>
  series.recurrence === 'daily' &&
  FOUR_HOUR_SERIES_SLUG_PATTERN.test(series.slug)
    ? '4h'
    : series.recurrence;

export const getL1Headers = async ({ address }: { address: string }) => {
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: POLYGON_MAINNET_CHAIN_ID,
  };

  const types = {
    EIP712Domain,
    ...ClobAuthDomain,
  };

  const message = {
    address,
    timestamp: `${Math.floor(Date.now() / 1000)}`,
    nonce: 0,
    message: MSG_TO_SIGN,
  };

  const signature = await Engine.context.KeyringController.signTypedMessage(
    {
      data: {
        domain,
        types,
        message,
        primaryType: 'ClobAuth',
      },
      from: address,
    },
    SignTypedDataVersion.V4,
  );

  const headers = {
    POLY_ADDRESS: address,
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: `${message.timestamp}`,
    POLY_NONCE: `${message.nonce}`,
  };

  return headers;
};

/**
 * Builds the canonical Polymarket CLOB HMAC signature
 *
 * @param secret
 * @param timestamp
 * @param method
 * @param requestPath
 * @param body
 * @returns string
 */
export const buildPolyHmacSignature = async (
  secret: string,
  timestamp: number,
  method: string,
  requestPath: string,
  body?: string,
): Promise<string> => {
  let message = timestamp + method + requestPath;
  if (body !== undefined) {
    message += body;
  }
  const base64Secret = Buffer.from(secret, 'base64');
  const hmac = global.crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');

  // NOTE: Must be url safe base64 encoding, but keep base64 "=" suffix
  // Convert '+' to '-'
  // Convert '/' to '_'
  const sigUrlSafe = replaceAll(replaceAll(sig, '+', '-'), '/', '_');
  return sigUrlSafe;
};

export const getL2Headers = async ({
  l2HeaderArgs,
  timestamp,
  address,
  apiKey,
}: {
  l2HeaderArgs: L2HeaderArgs;
  timestamp?: number;
  address: string;
  apiKey: ApiKeyCreds;
}) => {
  let ts = Math.floor(Date.now() / 1000);
  if (timestamp !== undefined) {
    ts = timestamp;
  }

  const sig = await buildPolyHmacSignature(
    apiKey?.secret || '',
    ts,
    l2HeaderArgs.method,
    l2HeaderArgs.requestPath,
    l2HeaderArgs.body,
  );

  const headers = {
    POLY_ADDRESS: address ?? '',
    POLY_SIGNATURE: sig,
    POLY_TIMESTAMP: `${ts}`,
    POLY_API_KEY: apiKey?.apiKey || '',
    POLY_PASSPHRASE: apiKey?.passphrase || '',
  };

  return headers;
};

function getClobEndpoint({
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
} = {}): string {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  if (clobVersion === 'v2') {
    return clobBaseUrl ?? CLOB_ENDPOINT;
  }

  return CLOB_ENDPOINT;
}

const clobMarketInfoCache = new Map<string, ClobMarketInfo>();
const reportedClobMarketInfoFailures = new Set<string>();

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalFiniteNumber = (value: unknown): boolean =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

const isOptionalNullableFiniteNumber = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'number' && Number.isFinite(value));

const isOptionalNullableBoolean = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'boolean';

const isClobFeeDetails = (value: unknown): value is ClobFeeDetails =>
  isObjectRecord(value) &&
  isOptionalNullableFiniteNumber(value.r) &&
  isOptionalNullableFiniteNumber(value.e) &&
  isOptionalNullableBoolean(value.to);

const isClobMarketInfo = (value: unknown): value is ClobMarketInfo =>
  isObjectRecord(value) &&
  (value.fd === undefined || isClobFeeDetails(value.fd)) &&
  isOptionalFiniteNumber(value.mts) &&
  isOptionalFiniteNumber(value.mos);

const ensureClobMarketInfoError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

const getClobMarketInfoFailureContext = (conditionId: string) => ({
  tags: {
    feature: PREDICT_CONSTANTS.FEATURE_NAME,
    provider: POLYMARKET_PROVIDER_ID,
  },
  context: {
    name: 'PolymarketUtils',
    data: {
      method: 'getClobMarketInfo',
      conditionId,
    },
  },
});

export const clearClobMarketInfoSessionState = () => {
  clobMarketInfoCache.clear();
  reportedClobMarketInfoFailures.clear();
};

export const clearClobMarketInfoCache = () => {
  clobMarketInfoCache.clear();
};

export const deriveApiKey = async ({
  address,
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  address: string;
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
}) => {
  const headers = await getL1Headers({ address });
  const url = `${getClobEndpoint({
    clobVersion,
    clobBaseUrl,
  })}/auth/derive-api-key`;
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to derive API key');
  }
  const apiKeyRaw = await parseJsonOrThrow<ApiKeyCreds>(response, url);
  return apiKeyRaw;
};

export const createApiKey = async ({
  address,
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  address: string;
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
}) => {
  const headers = await getL1Headers({ address });
  const url = `${getClobEndpoint({ clobVersion, clobBaseUrl })}/auth/api-key`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: '',
  });
  if (response.status === 400) {
    return await deriveApiKey({ address, clobVersion, clobBaseUrl });
  }
  const apiKeyRaw = await parseJsonOrThrow<ApiKeyCreds>(response, url);
  return apiKeyRaw;
};

export const priceValid = (price: number, tickSize: TickSize): boolean =>
  price >= parseFloat(tickSize) && price <= 1 - parseFloat(tickSize);

export const getClobMarketInfo = async ({
  conditionId,
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  conditionId: string;
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
}): Promise<ClobMarketInfo> => {
  const clobEndpoint = getClobEndpoint({ clobVersion, clobBaseUrl });
  const cacheKey = `${clobEndpoint}:${conditionId}`;
  const cachedMarketInfo = clobMarketInfoCache.get(cacheKey);

  if (cachedMarketInfo) {
    return cachedMarketInfo;
  }

  const response = await fetch(`${clobEndpoint}/clob-markets/${conditionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to get CLOB market info');
  }

  const marketInfo = await response.json();

  if (!isClobMarketInfo(marketInfo)) {
    throw new Error('Invalid CLOB market info response');
  }

  clobMarketInfoCache.set(cacheKey, marketInfo);
  reportedClobMarketInfoFailures.delete(cacheKey);
  return marketInfo;
};

export const getClobMarketInfoSafe = async ({
  conditionId,
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  conditionId: string;
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
}): Promise<ClobMarketInfo | undefined> => {
  const failureKey = `${getClobEndpoint({ clobVersion, clobBaseUrl })}:${conditionId}`;

  try {
    return await getClobMarketInfo({ conditionId, clobVersion, clobBaseUrl });
  } catch (error) {
    if (!reportedClobMarketInfoFailures.has(failureKey)) {
      Logger.error(
        ensureClobMarketInfoError(error),
        getClobMarketInfoFailureContext(conditionId),
      );
      reportedClobMarketInfoFailures.add(failureKey);
    }

    return undefined;
  }
};

const isValidFeeMetadata = (
  marketInfo?: ClobMarketInfo,
): marketInfo is ClobMarketInfo & {
  fd: { r: number; e: number };
} => {
  const rate = marketInfo?.fd?.r;
  const exponent = marketInfo?.fd?.e;

  return (
    typeof rate === 'number' &&
    Number.isFinite(rate) &&
    rate >= 0 &&
    typeof exponent === 'number' &&
    Number.isFinite(exponent) &&
    exponent >= 0
  );
};

const calculateMarketFeeAtPrice = ({
  amountUsd,
  rate,
  exponent,
  price,
}: {
  amountUsd: number;
  rate: number;
  exponent: number;
  price: number;
}): number => {
  if (
    amountUsd <= 0 ||
    rate <= 0 ||
    price <= 0 ||
    price >= 1 ||
    !Number.isFinite(price)
  ) {
    return 0;
  }

  const fee =
    amountUsd * rate * price ** (exponent - 1) * (1 - price) ** exponent;

  return Number.isFinite(fee) && fee > 0 ? fee : 0;
};

export const calculateConservativeBuyMarketFee = ({
  preview,
  marketInfo,
}: {
  preview: OrderPreview;
  marketInfo?: ClobMarketInfo;
}): number => {
  if (preview.side !== Side.BUY || !isValidFeeMetadata(marketInfo)) {
    return 0;
  }

  const amountUsd = preview.maxAmountSpent;
  const minAmountReceivedWithSlippage =
    getMinAmountReceivedWithSlippage(preview);

  if (
    amountUsd <= 0 ||
    preview.minAmountReceived <= 0 ||
    minAmountReceivedWithSlippage <= 0
  ) {
    return 0;
  }

  const snapshotAvgPrice = amountUsd / preview.minAmountReceived;
  const worstAllowedAvgPrice = amountUsd / minAmountReceivedWithSlippage;
  const leftEndpoint = Math.min(snapshotAvgPrice, worstAllowedAvgPrice);
  const rightEndpoint = Math.max(snapshotAvgPrice, worstAllowedAvgPrice);

  if (
    !Number.isFinite(leftEndpoint) ||
    !Number.isFinite(rightEndpoint) ||
    leftEndpoint <= 0 ||
    rightEndpoint >= 1
  ) {
    return 0;
  }

  const { r: rate, e: exponent } = marketInfo.fd;

  /*
   * Polymarket's CLOB fee model prices buy market fees as:
   *
   *   fee(p) = amountUsd * rate * p^(exponent - 1) * (1 - p)^exponent
   *
   * The exact fill price can move within the user's allowed slippage range, so
   * a "conservative" estimate means charging the highest fee possible over the
   * interval between the preview snapshot average price and the worst allowed
   * average price. A smooth single-variable curve reaches its maximum either at
   * one of the interval endpoints or, when it falls inside the interval, at the
   * critical point where the derivative is zero:
   *
   *   p* = (exponent - 1) / (2 * exponent - 1)
   */
  const candidates = [leftEndpoint, rightEndpoint];
  const criticalPoint = (exponent - 1) / (2 * exponent - 1);

  if (
    Number.isFinite(criticalPoint) &&
    criticalPoint > leftEndpoint &&
    criticalPoint < rightEndpoint
  ) {
    candidates.push(criticalPoint);
  }

  const conservativeMarketFee = Math.max(
    ...candidates.map((price) =>
      calculateMarketFeeAtPrice({
        amountUsd,
        rate,
        exponent,
        price,
      }),
    ),
  );

  return roundToFiveDecimals(conservativeMarketFee);
};

export const getOrderBook = async ({
  tokenId,
  clobVersion = 'v1',
  clobBaseUrl,
}: {
  tokenId: string;
  clobVersion?: 'v1' | 'v2';
  clobBaseUrl?: string;
}) => {
  const response = await fetch(
    `${getClobEndpoint({ clobVersion, clobBaseUrl })}/book?token_id=${tokenId}`,
    {
      method: 'GET',
    },
  );
  if (!response.ok) {
    const responseData = (await response.json()) as { error: string };
    if (
      responseData.error === 'No orderbook exists for the requested token id'
    ) {
      throw new Error(PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK);
    }
    throw new Error(responseData.error);
  }
  const responseData = (await response.json()) as OrderBook;
  return responseData;
};

export const generateSalt = (): Hex =>
  `0x${BigInt(Math.floor(Math.random() * 1000000)).toString(16)}`;

export const getContractConfig = (chainID: number): ContractConfig => {
  switch (chainID) {
    case POLYGON_MAINNET_CHAIN_ID:
      return MATIC_CONTRACTS_V2;
    default:
      throw new Error('MetaMask Predict is only supported on Polygon mainnet');
  }
};

export const encodeApprove = ({
  spender,
  amount,
}: {
  spender: string;
  amount: bigint | string;
}): Hex =>
  new Interface([
    'function approve(address spender, uint256 amount)',
  ]).encodeFunctionData('approve', [spender, amount]) as Hex;

export const encodeErc1155Approve = ({
  spender,
  approved,
}: {
  spender: string;
  approved: boolean;
}): Hex =>
  new Interface([
    'function setApprovalForAll(address operator, bool approved)',
  ]).encodeFunctionData('setApprovalForAll', [spender, approved]) as Hex;

export const encodeErc20Transfer = ({
  to,
  value,
}: {
  to: string;
  value: bigint | string | number;
}): Hex =>
  new Interface([
    'function transfer(address to, uint256 value)',
  ]).encodeFunctionData('transfer', [to, value]) as Hex;

function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace);
}

const normalizeSportsMarketType = (type: string): string => {
  const lower = type.toLowerCase();
  if (lower.startsWith('first_half_')) {
    return lower.slice('first_half_'.length);
  }
  return lower;
};

const getSportsMarketTypePriority = (type: string): number =>
  SPORTS_MARKET_TYPE_PRIORITIES[type.toLowerCase()] ?? 3;

export function buildOutcomeGroups(
  outcomes: PredictOutcome[],
): PredictOutcomeGroup[] {
  if (outcomes.length === 0) {
    return [];
  }

  const groupMap = new Map<string, PredictOutcome[]>();

  for (const outcome of outcomes) {
    const groupKey =
      (outcome.sportsMarketType &&
        SPORTS_MARKET_TYPE_TO_GROUP[outcome.sportsMarketType]) ||
      DEFAULT_GROUP_KEY;

    const bucket = groupMap.get(groupKey);
    if (bucket) {
      bucket.push(outcome);
    } else {
      groupMap.set(groupKey, [outcome]);
    }
  }

  for (const [, groupOutcomes] of groupMap) {
    groupOutcomes.sort((a, b) => {
      const priorityDiff =
        getSportsMarketTypePriority(
          normalizeSportsMarketType(a.sportsMarketType ?? ''),
        ) -
        getSportsMarketTypePriority(
          normalizeSportsMarketType(b.sportsMarketType ?? ''),
        );
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const volumeDiff = b.volume - a.volume;
      if (volumeDiff !== 0) return volumeDiff;
      return (b.liquidity ?? 0) - (a.liquidity ?? 0);
    });
  }

  const groupEntries = [...groupMap.entries()];
  groupEntries.sort((a, b) => {
    const aIndex = GROUP_ORDER.indexOf(a[0]);
    const bIndex = GROUP_ORDER.indexOf(b[0]);
    const aPriority = aIndex === -1 ? GROUP_ORDER.length : aIndex;
    const bPriority = bIndex === -1 ? GROUP_ORDER.length : bIndex;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a[0].localeCompare(b[0]);
  });

  return groupEntries.map(([key, groupOutcomes]) => {
    const typeMap = new Map<string, PredictOutcome[]>();
    for (const outcome of groupOutcomes) {
      const type = outcome.sportsMarketType ?? key;
      const bucket = typeMap.get(type);
      if (bucket) {
        bucket.push(outcome);
      } else {
        typeMap.set(type, [outcome]);
      }
    }

    if (typeMap.size < 2) {
      return { key, outcomes: groupOutcomes };
    }

    const subgroupEntries = [...typeMap.entries()];
    subgroupEntries.sort(
      (a, b) =>
        getSportsMarketTypePriority(normalizeSportsMarketType(a[0])) -
        getSportsMarketTypePriority(normalizeSportsMarketType(b[0])),
    );

    return {
      key,
      outcomes: [],
      subgroups: subgroupEntries.map(([subKey, subOutcomes]) => ({
        key: subKey,
        outcomes: subOutcomes,
      })),
    };
  });
}

export const isSpreadMarket = (market: PolymarketApiMarket): boolean =>
  market.sportsMarketType?.toLowerCase().includes('spread') ?? false;

const isMoneylineLikeMarket = (market: PolymarketApiMarket): boolean =>
  isMoneylineLikeMarketType(market.sportsMarketType);

/**
 * Sort markets within a sports market type group by liquidity + volume (descending)
 */
const sortByLiquidityAndVolume = (
  markets: PolymarketApiMarket[],
): PolymarketApiMarket[] =>
  [...markets].sort((a, b) => {
    const aScore = (a.liquidity ?? 0) + (a.volumeNum ?? 0);
    const bScore = (b.liquidity ?? 0) + (b.volumeNum ?? 0);
    return bScore - aScore;
  });

const formatMarketGroupItemTitle = (market: PolymarketApiMarket): string => {
  if (isSpreadMarket(market)) {
    // Remove the dash before the spread number (e.g., "FC-Dallas -3.5" → "FC-Dallas 3.5")
    // Uses negative lookahead to target dash followed by digit, not dashes in team names
    return market.groupItemTitle.replace(/-(?=\d)/, '');
  }

  if (isMoneylineLikeMarket(market)) {
    return market.groupItemTitle || market.question;
  }
  return market.groupItemTitle;
};

const YES_NO_TO_OVER_UNDER: Record<string, string> = {
  Yes: 'Over',
  No: 'Under',
};

const isOverUnderMarket = (market: PolymarketApiMarket): boolean =>
  market.groupItemTitle?.includes('O/U') ?? false;

const formatOutcomeTitles = (market: PolymarketApiMarket): string[] => {
  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  if (isSpreadMarket(market)) {
    const line = market.line ? Math.abs(market.line) : 0;
    return outcomes.map((outcome: string, index: number) =>
      line ? `${outcome} ${index > 0 ? `+${line}` : `-${line}`}` : outcome,
    );
  }
  if (isOverUnderMarket(market)) {
    return outcomes.map(
      (outcome: string) => YES_NO_TO_OVER_UNDER[outcome] ?? outcome,
    );
  }
  return outcomes;
};

const OVER_UNDER_SHORT: Record<string, string> = {
  Over: 'O',
  Under: 'U',
  Yes: 'O',
  No: 'U',
};

const buildNameToAbbreviation = (
  game: PredictMarketGame,
): Record<string, string> => ({
  [game.homeTeam.name]: game.homeTeam.abbreviation,
  ...(game.homeTeam.alias && {
    [game.homeTeam.alias]: game.homeTeam.abbreviation,
  }),
  [game.awayTeam.name]: game.awayTeam.abbreviation,
  ...(game.awayTeam.alias && {
    [game.awayTeam.alias]: game.awayTeam.abbreviation,
  }),
});

const formatOutcomeShortTitles = (
  market: PolymarketApiMarket,
  game: PredictMarketGame,
): (string | undefined)[] => {
  const outcomes: string[] = market.outcomes ? JSON.parse(market.outcomes) : [];
  const nameToAbbr = buildNameToAbbreviation(game);

  if (isSpreadMarket(market)) {
    const line = market.line ? Math.abs(market.line) : 0;
    return outcomes.map((outcome: string, index: number) => {
      const abbr = nameToAbbr[outcome];
      if (!abbr) return undefined;
      return line ? `${abbr} ${index > 0 ? `+${line}` : `-${line}`}` : abbr;
    });
  }

  return outcomes.map((outcome: string) => {
    const shortOU = OVER_UNDER_SHORT[outcome];
    if (shortOU && market.line != null) {
      return `${shortOU} ${market.line}`;
    }

    const abbr = nameToAbbr[outcome];
    return abbr ?? undefined;
  });
};

const sortOutcomeTokens = (
  outcomeTokens: PredictOutcomeToken[],
  market: PolymarketApiMarket,
  event: PolymarketApiEvent,
): PredictOutcomeToken[] => {
  if (isSpreadMarket(market)) {
    const teamA = event.title.split(' vs. ')[0];
    return [...outcomeTokens].sort((a, b) => {
      // teamA should come first
      if (a.title.includes(teamA)) {
        return -1;
      }
      if (b.title.includes(teamA)) {
        return 1;
      }
      return 0;
    });
  }

  return outcomeTokens;
};

const getNegRiskYesTokenTitle = (
  market: PolymarketApiMarket,
): string | undefined => {
  if (
    !market.negRisk ||
    !isMoneylineLikeMarket(market) ||
    !market.groupItemTitle
  ) {
    return undefined;
  }
  return market.groupItemTitle.toLowerCase().startsWith('draw')
    ? 'Draw'
    : market.groupItemTitle;
};

const resolveNegRiskShortTitles = (
  market: PolymarketApiMarket,
  game: PredictMarketGame,
): { yesShort?: string; noShort?: string } => {
  if (
    !market.negRisk ||
    !isMoneylineLikeMarket(market) ||
    !market.groupItemTitle
  ) {
    return {};
  }

  if (market.groupItemTitle.toLowerCase().startsWith('draw')) {
    return {};
  }

  const nameToAbbr = buildNameToAbbreviation(game);
  const yesAbbr = nameToAbbr[market.groupItemTitle];
  if (!yesAbbr) return {};

  const isHome = yesAbbr === game.homeTeam.abbreviation;
  const noAbbr = isHome
    ? game.awayTeam.abbreviation
    : game.homeTeam.abbreviation;

  return { yesShort: yesAbbr, noShort: noAbbr };
};

const parsePolymarketMarketOutcomes = (
  market: PolymarketApiMarket,
  event: PolymarketApiEvent,
  game?: PredictMarketGame,
): PredictOutcomeToken[] => {
  const outcomeTokensIds = market.clobTokenIds
    ? JSON.parse(market.clobTokenIds)
    : [];
  const outcomes = formatOutcomeTitles(market);
  const shortTitles = game ? formatOutcomeShortTitles(market, game) : [];
  const outcomePrices = market.outcomePrices
    ? JSON.parse(market.outcomePrices)
    : [];

  const negRiskYesTitle = getNegRiskYesTokenTitle(market);
  const negRiskShort = game ? resolveNegRiskShortTitles(market, game) : {};

  const outcomeTokens = outcomeTokensIds.map(
    (tokenId: string, index: number) => {
      const isYes = outcomes[index] === 'Yes';
      const isNo = outcomes[index] === 'No';

      let title = outcomes[index];
      if (negRiskYesTitle && isYes) {
        title = negRiskYesTitle;
      }

      let shortTitle: string | undefined = shortTitles[index];
      if (negRiskYesTitle && isYes && negRiskShort.yesShort) {
        shortTitle = negRiskShort.yesShort;
      } else if (negRiskYesTitle && isNo && negRiskShort.noShort) {
        shortTitle = negRiskShort.noShort;
      }

      return {
        id: tokenId,
        title,
        ...(shortTitle && { shortTitle }),
        price: parseFloat(outcomePrices[index]),
      };
    },
  );
  return sortOutcomeTokens(outcomeTokens, market, event);
};

/**
 * Sort sport markets by:
 * 1. Group by sportsMarketType
 * 2. Order groups: moneyline first, spreads second, totals third, then alphabetically
 * 3. Within each group, sort by liquidity + volume (descending)
 * 4. Return flattened array of all groups in order
 */
export const sortGameMarkets = (
  markets: PolymarketApiMarket[],
): PolymarketApiMarket[] => {
  // Group markets by sportsMarketType
  const groupedMarkets = markets.reduce<Record<string, PolymarketApiMarket[]>>(
    (acc, market) => {
      const type = market.sportsMarketType ?? 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(market);
      return acc;
    },
    {},
  );

  // Get all unique types and sort them by priority
  const sortedTypes = Object.keys(groupedMarkets).sort((a, b) => {
    const priorityA = getSportsMarketTypePriority(a);
    const priorityB = getSportsMarketTypePriority(b);

    // If same priority (both are "other" category), sort alphabetically
    if (priorityA === priorityB && priorityA === 3) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }

    return priorityA - priorityB;
  });

  // Sort each group by liquidity + volume, then flatten
  return sortedTypes.flatMap((type) =>
    sortByLiquidityAndVolume(groupedMarkets[type]),
  );
};

export const sortMarketsByField = (
  markets: PolymarketApiMarket[],
  sortBy: 'price' | 'ascending' | 'descending',
): PolymarketApiMarket[] => {
  // If sortBy is not returned, do not sort
  if (!sortBy) {
    return markets;
  }

  return [...markets].sort((a, b) => {
    switch (sortBy) {
      case 'price': {
        // Sort by descending percentage chance from market.outcomePrices[0]
        const aPrice = a.outcomePrices ? JSON.parse(a.outcomePrices)[0] : '0';
        const bPrice = b.outcomePrices ? JSON.parse(b.outcomePrices)[0] : '0';
        return parseFloat(bPrice) - parseFloat(aPrice);
      }
      case 'ascending': {
        // Sort by market.groupItemThreshold ascending
        return (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0);
      }
      case 'descending': {
        // Sort by market.groupItemThreshold descending
        return (b.groupItemThreshold ?? 0) - (a.groupItemThreshold ?? 0);
      }
      default:
        return 0;
    }
  });
};

export const sortMarkets = ({
  event,
  sortBy,
  isGameEvent,
}: {
  event: PolymarketApiEvent;
  sortBy?: 'price' | 'ascending' | 'descending';
  isGameEvent?: boolean;
}): PolymarketApiMarket[] => {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const eventSortBy = event.sortBy;

  if (isGameEvent) {
    return sortGameMarkets(markets);
  }

  if (sortBy) {
    return sortMarketsByField(markets, sortBy);
  }

  if (eventSortBy) {
    return sortMarketsByField(markets, eventSortBy);
  }

  return markets;
};

export const parsePolymarketMarket = (
  market: PolymarketApiMarket,
  event: PolymarketApiEvent,
  game?: PredictMarketGame,
): PredictOutcome => ({
  id: market.conditionId,
  providerId: POLYMARKET_PROVIDER_ID,
  marketId: event.id,
  title: market.question,
  description: market.description,
  image: market.icon ?? market.image,
  groupItemTitle: formatMarketGroupItemTitle(market),
  groupItemThreshold:
    market.groupItemThreshold != null
      ? Number(market.groupItemThreshold)
      : undefined,
  status: market.closed ? PredictMarketStatus.CLOSED : PredictMarketStatus.OPEN,
  volume: market.volumeNum ?? 0,
  liquidity: market.liquidity ?? 0,
  tokens: parsePolymarketMarketOutcomes(market, event, game),
  sportsMarketType: market.sportsMarketType,
  line: market.line,
  negRisk: market.negRisk,
  tickSize: market.orderPriceMinTickSize.toString(),
  resolvedBy: market.resolvedBy,
  resolutionStatus: market.umaResolutionStatus,
});

export type PolymarketTeamLookupFn = (
  league: PredictSportsLeague,
  abbreviation: string,
) => PolymarketApiTeam | undefined;

export interface ParsePolymarketEventsOptions {
  category: PredictCategory;
  sortMarketsBy?: 'price' | 'ascending' | 'descending';
  teamLookup?: PolymarketTeamLookupFn;
  extendedSportsMarketsLeagues?: string[];
}

export const parsePolymarketEvents = (
  events: PolymarketApiEvent[],
  categoryOrOptions: PredictCategory | ParsePolymarketEventsOptions,
  sortMarketsBy?: 'price' | 'ascending' | 'descending',
): PredictMarket[] => {
  const options: ParsePolymarketEventsOptions =
    typeof categoryOrOptions === 'string'
      ? { category: categoryOrOptions, sortMarketsBy }
      : categoryOrOptions;

  const { category, teamLookup, extendedSportsMarketsLeagues } = options;
  const sortBy = options.sortMarketsBy ?? sortMarketsBy;

  const parsedMarkets: PredictMarket[] = events.map(
    (event: PolymarketApiEvent) => {
      const tags = Array.isArray(event.tags) ? event.tags : [];
      const eventLeague = getEventLeague(event, extendedSportsMarketsLeagues);

      const predictTeamLookup: TeamLookup | undefined = teamLookup
        ? (league, abbr) => {
            const apiTeam = teamLookup(league, abbr);
            return apiTeam ? mapApiTeamToPredictTeam(apiTeam) : undefined;
          }
        : undefined;

      const game =
        eventLeague && predictTeamLookup
          ? (buildGameData(event, eventLeague, predictTeamLookup) ?? undefined)
          : undefined;

      const markets = sortMarkets({
        event,
        sortBy,
        isGameEvent: !!game,
      }).filter((market: PolymarketApiMarket) => market?.active !== false);

      // As per Polymarket's team, we should use the first market's description
      // rather than the event's description. The event's description is not
      // guaranteed to be accurate. They also do this on their webbsite.
      //
      // However, we noticed that the above statement is not correct, at least for game events.
      const description = game
        ? event.description
        : (event.markets?.[0]?.description ?? event.description);

      const seriesData =
        event.series?.length > 0
          ? {
              id: event.series[0].id,
              slug: event.series[0].slug,
              title: event.series[0].title,
              recurrence: getSeriesRecurrence(event.series[0]),
            }
          : undefined;

      const outcomes = markets.map((market: PolymarketApiMarket) =>
        parsePolymarketMarket(market, event, game),
      );

      const outcomeGroupingEnabled =
        game &&
        eventLeague &&
        extendedSportsMarketsLeagues?.includes(eventLeague);

      const outcomeGroups = outcomeGroupingEnabled
        ? buildOutcomeGroups(outcomes)
        : undefined;

      return {
        id: event.id,
        slug: event.slug,
        providerId: POLYMARKET_PROVIDER_ID,
        title: event.title,
        description,
        image: event.icon,
        status: event.closed
          ? PredictMarketStatus.CLOSED
          : PredictMarketStatus.OPEN,
        recurrence: getRecurrence(event.series),
        endDate: event.endDate,
        category,
        tags: tags.map((t) => t.slug),
        outcomes,
        ...(outcomeGroups && { outcomeGroups }),
        liquidity: event.liquidity,
        volume: event.volume,
        game,
        ...(seriesData && { series: seriesData }),
        ...(event.parentEventId !== undefined && {
          parentMarketId: event.parentEventId,
        }),
      };
    },
  );
  return parsedMarkets;
};

/**
 * Normalizes Polymarket /activity entries to PredictActivity[]
 * Keeps essential metadata used by UI (title/outcome/icon)
 * Note: Lost redeems (activities with no payout) are excluded by the API via excludeLostRedeems parameter
 */
export const parsePolymarketActivity = (
  activities: PolymarketApiActivity[],
): PredictActivity[] => {
  if (!Array.isArray(activities)) {
    return [];
  }

  const parsedActivities: PredictActivity[] = activities.map((activity) => {
    // Normalize entry type: TRADE with explicit side => buy/sell, otherwise claimWinnings
    const entryType: 'buy' | 'sell' | 'claimWinnings' =
      activity.type === 'TRADE'
        ? activity.side === 'BUY'
          ? 'buy'
          : activity.side === 'SELL'
            ? 'sell'
            : 'claimWinnings'
        : 'claimWinnings';

    const id =
      activity.transactionHash ?? String(activity.timestamp ?? Math.random());
    const timestamp = Number(activity.timestamp ?? Date.now());

    const price = Number(activity.price ?? 0);
    const amount = Number(activity.usdcSize ?? 0);

    const outcomeId = String(activity.conditionId ?? '');
    const marketId = String(activity.conditionId ?? '');
    const outcomeTokenId = Number(activity.outcomeIndex ?? 0);
    const title = String(activity.title ?? 'Market');
    const outcome = activity.outcome ? String(activity.outcome) : undefined;
    const icon = activity.icon as string | undefined;

    const parsedActivity: PredictActivity = {
      id,
      providerId: POLYMARKET_PROVIDER_ID,
      entry:
        entryType === 'claimWinnings'
          ? { type: 'claimWinnings', timestamp, amount }
          : {
              type: entryType,
              timestamp,
              marketId,
              outcomeId,
              outcomeTokenId,
              amount,
              price,
            },
      title,
      outcome,
      icon,
    } as PredictActivity & {
      title?: string;
      outcome?: string;
      icon?: string;
    };

    return parsedActivity;
  });

  return parsedActivities;
};

export interface FetchEventsResult {
  events: PolymarketApiEvent[];
  category: PredictCategory;
  nextCursor: string | null;
}

const EXACT_QUERY_PARAM_CATEGORIES: readonly PredictCategory[] = [
  'hot',
  'world-cup',
];

const appendCustomQueryParams = (
  params: URLSearchParams,
  customQueryParams?: string,
): string => {
  const queryParams = params.toString();
  return customQueryParams
    ? `${queryParams}&${customQueryParams}`
    : queryParams;
};

export const fetchEventsFromPolymarketApi = async (
  params?: GetMarketsParams,
): Promise<FetchEventsResult> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

  const {
    category = 'trending',
    limit = 20,
    afterCursor,
    customQueryParams,
  } = params || {};
  DevLogger.log(
    'Getting markets via Polymarket API for category:',
    category,
    'limit:',
    limit,
    'hasAfterCursor:',
    Boolean(afterCursor),
  );

  const queryParams = new URLSearchParams({
    limit: String(limit),
  });

  if (afterCursor) {
    queryParams.set('after_cursor', afterCursor);
  }

  let queryParamsEvents: string;

  const isExactQueryTabWithCustomQuery =
    EXACT_QUERY_PARAM_CATEGORIES.includes(category) && customQueryParams;

  if (isExactQueryTabWithCustomQuery) {
    queryParamsEvents = appendCustomQueryParams(queryParams, customQueryParams);
  } else if (category === 'world-cup') {
    queryParams.set('active', 'true');
    queryParams.set('archived', 'false');
    queryParams.set('closed', 'false');
    queryParams.set('tag_slug', PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG);
    queryParams.set('order', 'volume24hr');
    queryParams.set('ascending', 'false');
    queryParamsEvents = queryParams.toString();
  } else {
    queryParams.set('active', 'true');
    queryParams.set('archived', 'false');
    queryParams.set('closed', 'false');
    const ascendingCategories: Set<PredictCategory> = new Set(['ending-soon']);
    queryParams.set('ascending', String(ascendingCategories.has(category)));
    queryParams.set('liquidity_min', String(10000.0));
    queryParams.set('volume_min', String(10000.0));

    const categoryParamMap: Record<
      Exclude<PredictCategory, 'world-cup'>,
      Record<string, string>
    > = {
      trending: { order: 'volume24hr' },
      'ending-soon': { order: 'endDate' },
      new: { order: 'startDate', exclude_tag_id: '102169' },
      sports: { tag_slug: 'sports', order: 'volume24hr' },
      crypto: { tag_slug: 'crypto', order: 'volume24hr' },
      politics: { tag_slug: 'politics', order: 'volume24hr' },
      hot: { order: 'volume24hr' },
    };

    Object.entries(categoryParamMap[category]).forEach(([key, value]) => {
      queryParams.set(key, value);
    });

    queryParamsEvents = appendCustomQueryParams(queryParams, customQueryParams);
  }

  const endpoint = `${GAMMA_API_ENDPOINT}/events/keyset?${queryParamsEvents}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error('Failed to get markets');
  }
  const data = await response.json();
  const responseData = data as PolymarketApiEventsKeysetResponse;

  if (!Array.isArray(responseData.events)) {
    throw new Error('Malformed keyset events response');
  }

  const events: PolymarketApiEvent[] = responseData.events;

  return {
    events,
    category,
    nextCursor: responseData.next_cursor ?? null,
  };
};

export interface SearchEventsResult {
  events: PolymarketApiEvent[];
  totalResults: number;
}

export const searchEventsFromPolymarketApi = async ({
  q,
  limit = 20,
  page = 1,
}: SearchMarketsParams): Promise<SearchEventsResult> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

  DevLogger.log('Searching markets via Polymarket API:', {
    hasQuery: Boolean(q),
    limit,
    page,
  });

  const queryParams = new URLSearchParams({
    q,
    type: 'events',
    events_status: 'active',
    sort: 'volume_24hr',
    presets: 'EventsTitle',
    limit_per_type: String(limit),
    page: String(page),
  });

  const endpoint = `${GAMMA_API_ENDPOINT}/public-search?${queryParams.toString()}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error('Failed to search markets');
  }

  const data = await response.json();
  return {
    events: Array.isArray(data?.events) ? data.events : [],
    totalResults: (data?.pagination?.totalResults as number) ?? 0,
  };
};

export interface PolymarketCarouselItem {
  event: PolymarketApiEvent;
  type: string;
  shortName: string;
  options: PolymarketApiMarket[];
}

export const fetchCarouselFromPolymarketApi = async (): Promise<
  PolymarketCarouselItem[]
> => {
  const { HOMEPAGE_CAROUSEL_ENDPOINT } = getPolymarketEndpoints();

  DevLogger.log('Fetching carousel data from:', HOMEPAGE_CAROUSEL_ENDPOINT);

  const response = await fetch(HOMEPAGE_CAROUSEL_ENDPOINT);
  if (!response.ok) {
    throw new Error('Failed to fetch carousel data');
  }
  const data = await response.json();
  const rawItems: PolymarketCarouselItem[] = Array.isArray(data) ? data : [];

  const items = rawItems.map((item) => ({
    ...item,
    event: {
      ...item.event,
      markets: item.event.markets?.map((market) => ({
        ...market,
        outcomes: Array.isArray(market.outcomes)
          ? JSON.stringify(market.outcomes)
          : market.outcomes,
        outcomePrices: Array.isArray(market.outcomePrices)
          ? JSON.stringify(market.outcomePrices)
          : market.outcomePrices,
        clobTokenIds: Array.isArray(market.clobTokenIds)
          ? JSON.stringify(market.clobTokenIds)
          : market.clobTokenIds,
      })),
    },
  }));

  DevLogger.log('Carousel data received:', items.length, 'items');

  return items;
};

export const getMarketDetailsFromGammaApi = async ({
  marketId,
}: {
  marketId: string;
}): Promise<PolymarketApiEvent> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const response = await fetch(`${GAMMA_API_ENDPOINT}/events/${marketId}`);

  if (!response.ok) {
    throw new Error('Failed to get market details');
  }

  const responseData = await response.json();
  return responseData as PolymarketApiEvent;
};

export const fetchChildEventsFromGammaApi = async ({
  parentEventId,
}: {
  parentEventId: string | number;
}): Promise<PolymarketApiEvent[]> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const queryParams = new URLSearchParams({
    parent_event_id: String(parentEventId),
    include_children: 'true',
    limit: '100',
  });

  const response = await fetch(
    `${GAMMA_API_ENDPOINT}/events/keyset?${queryParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Failed to fetch child events');
  }

  const responseData =
    (await response.json()) as PolymarketApiEventsKeysetResponse;

  if (!Array.isArray(responseData.events)) {
    throw new Error('Malformed keyset child events response');
  }

  return responseData.events;
};

export const mergeChildEventsIntoParent = (
  events: PolymarketApiEvent[],
): PolymarketApiEvent => {
  if (events.length === 0) {
    throw new Error('No events to merge');
  }

  const parent = events.find((e) => !e.parentEventId) ?? events[0];
  const children = events.filter((e) => e !== parent);

  if (children.length === 0) {
    return parent;
  }

  const childMarkets = children.flatMap((child) => child.markets ?? []);

  return {
    ...parent,
    markets: [...(parent.markets ?? []), ...childMarkets],
  };
};

export const getPredictPositionStatus = ({
  claimable,
  cashPnl,
}: {
  claimable: boolean;
  cashPnl: number;
}) => {
  if (!claimable) {
    return PredictPositionStatus.OPEN;
  }
  if (cashPnl > 0) {
    return PredictPositionStatus.WON;
  }
  return PredictPositionStatus.LOST;
};

const resolveNegRiskOutcomeLabel = (
  position: PolymarketPosition,
  teamLookup?: TeamLookup,
): string | undefined => {
  if (!position.negativeRisk || !position.eventSlug) {
    return undefined;
  }

  const league = SUPPORTED_SPORTS_LEAGUES.find(
    (l) => isDrawCapableLeague(l) && position.eventSlug?.startsWith(`${l}-`),
  );

  if (!league) {
    return undefined;
  }

  const prefix = position.eventSlug + '-';
  if (!position.slug.startsWith(prefix)) {
    return undefined;
  }

  const outcomeToken = position.slug.slice(prefix.length);
  if (!outcomeToken) {
    return undefined;
  }

  if (outcomeToken === 'draw') {
    return 'Draw';
  }

  if (!teamLookup) {
    return outcomeToken.toUpperCase();
  }

  return teamLookup(league, outcomeToken)?.name ?? outcomeToken.toUpperCase();
};

export const parsePolymarketPositions = async ({
  positions,
  teamLookup,
}: {
  positions: PolymarketPosition[];
  teamLookup?: TeamLookup;
}) => {
  const parsedPositions: PredictPosition[] = positions.map(
    (position: PolymarketPosition) => ({
      id: position.asset,
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: position.eventId,
      outcomeId: position.conditionId,
      outcome:
        resolveNegRiskOutcomeLabel(position, teamLookup) ?? position.outcome,
      outcomeTokenId: position.asset,
      outcomeIndex: position.outcomeIndex,
      negRisk: position.negativeRisk,
      amount: position.size,
      price: position.curPrice,
      status: getPredictPositionStatus({
        claimable: position.redeemable,
        cashPnl: position.cashPnl,
      }),
      realizedPnl: position.realizedPnl,
      percentPnl: position.percentPnl,
      currentValue: position.currentValue,
      cashPnl: position.cashPnl,
      initialValue: position.initialValue,
      avgPrice: position.avgPrice,
      endDate: position.endDate,
      title: position.title,
      icon: position.icon,
      size: position.size,
      claimable: position.redeemable,
    }),
  );

  return parsedPositions;
};

export const encodeRedeemPositions = ({
  collateralToken,
  parentCollectionId,
  conditionId,
  indexSets,
}: {
  collateralToken: string;
  parentCollectionId: string;
  conditionId: string;
  indexSets: (bigint | string | number)[];
}): Hex =>
  new Interface([
    'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)',
  ]).encodeFunctionData('redeemPositions', [
    collateralToken,
    parentCollectionId,
    conditionId,
    indexSets,
  ]) as Hex;

export const encodeRedeemNegRiskPositions = ({
  conditionId,
  amounts,
}: {
  conditionId: string;
  // amounts should always have length 2, with the first element being the amount of yes tokens to redeem and the
  // second element being the amount of no tokens to redeem
  amounts: (bigint | string | number)[];
}): Hex =>
  new Interface([
    'function redeemPositions(bytes32 _conditionId, uint256[] calldata _amounts)',
  ]).encodeFunctionData('redeemPositions', [conditionId, amounts]) as Hex;

export function encodeClaim(
  conditionId: string,
  negRisk: boolean,
  amounts?: (bigint | string | number)[],
): Hex {
  const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);
  if (!negRisk) {
    return encodeRedeemPositions({
      collateralToken: contractConfig.collateral,
      parentCollectionId: HASH_ZERO_BYTES32,
      conditionId,
      indexSets: [1, 2],
    });
  }

  // When negRisk is true, amounts must be provided
  if (!amounts) {
    throw new Error('amounts parameter is required when negRisk is true');
  }

  return encodeRedeemNegRiskPositions({
    conditionId,
    amounts,
  });
}

async function waiveFees({
  marketId,
  waiveList,
}: {
  marketId: string;
  waiveList: string[];
}) {
  const market = await getMarketDetailsFromGammaApi({ marketId });
  const { tags } = market;
  const slugs = tags?.map((t) => t.slug);
  return slugs?.some((slug) => waiveList?.includes(slug)) ?? false;
}

export async function calculateFees({
  feeCollection,
  marketId,
  userBetAmount,
}: {
  feeCollection?: PredictFeeCollection;
  marketId: string;
  userBetAmount: number;
}): Promise<PredictFees> {
  if (
    !feeCollection?.enabled ||
    (await waiveFees({ marketId, waiveList: feeCollection.waiveList }))
  ) {
    return {
      metamaskFee: 0,
      providerFee: 0,
      totalFee: 0,
      totalFeePercentage: 0,
      collector: '0x0',
      executors: [],
      permit2Enabled: false,
    };
  }

  const totalFeePercentage =
    (feeCollection.metamaskFee + feeCollection.providerFee) * 100;

  const metamaskFee = userBetAmount * feeCollection.metamaskFee;
  const providerFee = userBetAmount * feeCollection.providerFee;

  // Rounded to 6 decimals
  const totalFee = Math.round((metamaskFee + providerFee) * 1000000) / 1000000;

  return {
    metamaskFee,
    providerFee,
    totalFee,
    totalFeePercentage,
    collector: feeCollection.collector,
    executors: feeCollection.executors ?? [],
    permit2Enabled: feeCollection.permit2Enabled ?? false,
  };
}

export const getAllowanceCalls = (params: { address: string }) => {
  const { address } = params;
  const chainId = POLYGON_MAINNET_CHAIN_ID;
  const contractConfig = getContractConfig(chainId);
  const calls: OnchainTradeParams[] = [];

  const usdcExchange = encodeApprove({
    spender: contractConfig.exchange,
    amount: ethers.constants.MaxInt256.toString(),
  });
  calls.push({
    data: usdcExchange,
    to: contractConfig.collateral,
    chainId,
    from: address,
    value: '0x0',
  });

  const usdcNegRisk = encodeApprove({
    spender: contractConfig.negRiskExchange,
    amount: ethers.constants.MaxInt256.toString(),
  });

  calls.push({
    data: usdcNegRisk,
    to: contractConfig.collateral,
    chainId,
    from: address,
    value: '0x0',
  });

  const usdcAdapter = encodeApprove({
    spender: contractConfig.negRiskAdapter,
    amount: ethers.constants.MaxInt256.toString(),
  });
  calls.push({
    data: usdcAdapter,
    to: contractConfig.collateral,
    chainId,
    from: address,
    value: '0x0',
  });

  const conditionalExchange = encodeErc1155Approve({
    spender: contractConfig.exchange,
    approved: true,
  });

  calls.push({
    data: conditionalExchange,
    to: contractConfig.conditionalTokens,
    chainId,
    from: address,
    value: '0x0',
  });

  const conditionalNegRisk = encodeErc1155Approve({
    spender: contractConfig.negRiskExchange,
    approved: true,
  });
  calls.push({
    data: conditionalNegRisk,
    to: contractConfig.conditionalTokens,
    chainId,
    from: address,
    value: '0x0',
  });

  const conditionalAdapter = encodeErc1155Approve({
    spender: contractConfig.negRiskAdapter,
    approved: true,
  });
  calls.push({
    data: conditionalAdapter,
    to: contractConfig.conditionalTokens,
    chainId,
    from: address,
    value: '0x0',
  });

  return calls;
};

const parseNumericRpcResult = (res: string): bigint => {
  if (res === '0x') {
    return 0n;
  }

  return BigInt(res);
};

export const getAllowance = async ({
  tokenAddress,
  owner,
  spender,
}: {
  tokenAddress: string;
  owner: string;
  spender: string;
}): Promise<bigint> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Encode the allowance function call
  const data = new Interface([
    'function allowance(address owner, address spender) external view returns (uint256)',
  ]).encodeFunctionData('allowance', [owner, spender]);

  // Make the contract call
  const res = await query(ethQuery, 'call', [
    {
      to: tokenAddress,
      data,
    },
  ]);

  // Treat empty hex responses as zero to avoid breaking on sparse/mock RPCs.
  const allowance = parseNumericRpcResult(res);
  return allowance;
};

export const getIsApprovedForAll = async ({
  tokenAddress,
  owner,
  operator,
}: {
  tokenAddress: string;
  owner: string;
  operator: string;
}): Promise<boolean> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Encode the isApprovedForAll function call
  const data = new Interface([
    'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  ]).encodeFunctionData('isApprovedForAll', [owner, operator]);

  // Make the contract call
  const res = await query(ethQuery, 'call', [
    {
      to: tokenAddress,
      data,
    },
  ]);

  // Decode the result - convert hex to boolean
  const isApproved = parseNumericRpcResult(res) !== 0n;
  return isApproved;
};

export const getMarketPositions = async ({
  marketId,
  address,
}: {
  marketId: string;
  address: string;
}) => {
  const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
  const response = await fetch(
    `${DATA_API_ENDPOINT}/positions?eventId=${marketId}&user=${address}`,
  );
  if (!response.ok) {
    throw new Error('Failed to get market positions');
  }
  const responseData = await response.json();
  const parsedPositions = await parsePolymarketPositions({
    positions: responseData,
  });
  return parsedPositions;
};

export const getRawBalance = async ({
  address,
  tokenAddress,
}: {
  address: string;
  tokenAddress: string;
}): Promise<bigint> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  const data = new Interface([
    'function balanceOf(address account) external view returns (uint256)',
  ]).encodeFunctionData('balanceOf', [address]);

  const res = await query(ethQuery, 'call', [
    {
      to: tokenAddress,
      data,
    },
  ]);

  return parseNumericRpcResult(res);
};

export const getBalance = async ({
  address,
  tokenAddress,
}: {
  address: string;
  tokenAddress?: string;
}): Promise<number> => {
  const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);
  const balance = await getRawBalance({
    address,
    tokenAddress: tokenAddress ?? contractConfig.collateral,
  });

  return Number(balance) / 10 ** COLLATERAL_TOKEN_DECIMALS;
};

const matchBuyOrder = ({
  asks,
  dollarAmount,
}: {
  asks: OrderSummary[];
  dollarAmount: number;
}): { price: number; size: number } => {
  if (!asks.length) {
    throw new Error('no order match');
  }

  const sharePrice = parseFloat(asks[asks.length - 1].price);

  let quantity = 0;
  let sum = 0;

  for (let i = asks.length - 1; i >= 0; i--) {
    const e = asks[i];
    const entrySize = parseFloat(e.size);
    const entryPrice = parseFloat(e.price);
    const entryValue = entrySize * entryPrice;

    if (sum + entryValue <= dollarAmount) {
      quantity += entrySize;
      sum += entryValue;
    } else {
      const remainingAmount = dollarAmount - sum;
      const partialQuantity = remainingAmount / entryPrice;
      quantity += partialQuantity;
      return { price: sharePrice, size: quantity };
    }
  }

  if (sum === dollarAmount) {
    return {
      price: sharePrice,
      size: quantity,
    };
  }

  throw new Error('not enough shares to match user bet amount');
};

const matchSellOrder = ({
  bids,
  shareAmount,
}: {
  bids: OrderSummary[];
  shareAmount: number;
}): { price: number; size: number } => {
  if (!bids.length) {
    throw new Error('no order match');
  }

  const sharePrice = parseFloat(bids[bids.length - 1].price);

  let dollarAmount = 0;
  let sharesMatched = 0;

  for (let i = bids.length - 1; i >= 0; i--) {
    const e = bids[i];
    const entrySize = parseFloat(e.size);
    const entryPrice = parseFloat(e.price);

    if (sharesMatched + entrySize <= shareAmount) {
      sharesMatched += entrySize;
      dollarAmount += entrySize * entryPrice;
    } else {
      const remainingShares = shareAmount - sharesMatched;
      dollarAmount += remainingShares * entryPrice;
      return { price: sharePrice, size: dollarAmount };
    }
  }

  if (sharesMatched === shareAmount) {
    return {
      price: sharePrice,
      size: dollarAmount,
    };
  }

  throw new Error('not enough bids to match user share amount');
};

export const decimalPlaces = (num: number): number => {
  if (Number.isInteger(num)) {
    return 0;
  }

  const arr = num.toString().split('.');
  if (arr.length <= 1) {
    return 0;
  }

  return arr[1].length;
};

export const roundNormal = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num;
  }
  return Math.round((num + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
};

export const roundDown = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num;
  }
  return Math.floor(num * 10 ** decimals) / 10 ** decimals;
};

export const roundUp = (num: number, decimals: number): number => {
  if (decimalPlaces(num) <= decimals) {
    return num;
  }
  return Math.ceil(num * 10 ** decimals) / 10 ** decimals;
};

export const roundOrderAmount = ({
  amount,
  decimals,
}: {
  amount: number;
  decimals: number;
}): number => {
  if (decimalPlaces(amount) > decimals) {
    amount = roundUp(amount, decimals + 4);
    if (decimalPlaces(amount) > decimals) {
      amount = roundDown(amount, decimals);
    }
  }
  return amount;
};

export const previewOrder = async (
  params: Omit<PreviewOrderParams, 'providerId'> & {
    feeCollection?: PredictFeeCollection;
    isV2?: boolean;
    clobBaseUrl?: string;
  },
): Promise<OrderPreview> => {
  const {
    marketId,
    outcomeId,
    outcomeTokenId,
    side,
    size,
    feeCollection,
    isV2,
    clobBaseUrl,
  } = params;
  const [book, feeRateBps, marketInfo] = await Promise.all([
    getOrderBook({
      tokenId: outcomeTokenId,
      clobVersion: isV2 ? 'v2' : 'v1',
      clobBaseUrl: isV2 ? clobBaseUrl : undefined,
    }),
    Promise.resolve('0'),
    side === Side.BUY
      ? getClobMarketInfoSafe({
          conditionId: outcomeId,
          clobVersion: isV2 ? 'v2' : 'v1',
          clobBaseUrl: isV2 ? clobBaseUrl : undefined,
        })
      : Promise.resolve(undefined),
  ]);
  if (!book) {
    throw new Error(PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_BOOK);
  }
  const roundConfig = ROUNDING_CONFIG[book.tick_size as TickSize];

  if (side === Side.BUY) {
    const { asks } = book;
    if (!asks || asks.length === 0) {
      throw new Error(PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_BUY);
    }
    const { price: bestPrice, size: shareAmount } = matchBuyOrder({
      asks,
      dollarAmount: size,
    });
    const makerAmount = roundDown(size, roundConfig.size);
    const takerAmount = roundOrderAmount({
      amount: shareAmount,
      decimals: roundConfig.amount,
    });
    const preview: OrderPreview = {
      marketId,
      outcomeId,
      outcomeTokenId,
      timestamp: new Date(book.timestamp).getTime(),
      side: Side.BUY,
      sharePrice: bestPrice,
      maxAmountSpent: makerAmount,
      minAmountReceived: takerAmount,
      slippage: SLIPPAGE_BUY,
      tickSize: parseFloat(book.tick_size),
      minOrderSize: parseFloat(book.min_order_size),
      negRisk: book.neg_risk,
      feeRateBps,
    };

    const serviceFees = await calculateFees({
      feeCollection,
      marketId,
      userBetAmount: makerAmount,
    });
    const marketFee = calculateConservativeBuyMarketFee({
      preview,
      marketInfo,
    });

    return {
      ...preview,
      fees: {
        ...serviceFees,
        marketFee,
      },
    };
  }
  const { bids } = book;
  if (!bids || bids.length === 0) {
    throw new Error(PREDICT_ERROR_CODES.PREVIEW_NO_ORDER_MATCH_SELL);
  }
  const { price: bestPrice, size: dollarAmount } = matchSellOrder({
    bids,
    shareAmount: size,
  });
  const makerAmount = roundDown(size, roundConfig.size);
  const takerAmount = roundOrderAmount({
    amount: dollarAmount,
    decimals: roundConfig.amount,
  });
  return {
    marketId,
    outcomeId,
    outcomeTokenId,
    timestamp: new Date(book.timestamp).getTime(),
    side: Side.SELL,
    positionId: params.positionId,
    sharePrice: bestPrice,
    maxAmountSpent: makerAmount,
    minAmountReceived: takerAmount,
    slippage: SLIPPAGE_SELL,
    tickSize: parseFloat(book.tick_size),
    minOrderSize: parseFloat(book.min_order_size),
    negRisk: book.neg_risk,
    feeRateBps,
    // no fees for sell orders
  };
};
