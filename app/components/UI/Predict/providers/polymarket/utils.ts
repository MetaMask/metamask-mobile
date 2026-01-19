import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Hex, numberToHex } from '@metamask/utils';
import { ethers } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
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
  Result,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import { getRecurrence } from '../../utils/format';
import {
  buildGameData,
  getEventLeague,
  mapApiTeamToPredictTeam,
  type TeamLookup,
} from '../../utils/gameParser';
import type {
  GetMarketsParams,
  OrderPreview,
  PredictFees,
  PreviewOrderParams,
} from '../types';
import {
  ClobAuthDomain,
  EIP712Domain,
  HASH_ZERO_BYTES32,
  MATIC_CONTRACTS,
  MSG_TO_SIGN,
  POLYGON_MAINNET_CHAIN_ID,
  ROUNDING_CONFIG,
  SLIPPAGE_BUY,
  SLIPPAGE_SELL,
} from './constants';
import { SafeFeeAuthorization } from './safe/types';
import {
  ApiKeyCreds,
  ClobHeaders,
  ClobOrderObject,
  COLLATERAL_TOKEN_DECIMALS,
  ContractConfig,
  L2HeaderArgs,
  OrderData,
  OrderResponse,
  OrderSummary,
  PolymarketApiEvent,
  PolymarketApiActivity,
  PolymarketApiMarket,
  PolymarketApiTeam,
  PolymarketPosition,
  TickSize,
  OrderBook,
} from './types';
import { PREDICT_ERROR_CODES } from '../../constants/errors';
import { PredictFeeCollection } from '../../types/flags';

export const getPolymarketEndpoints = () => ({
  GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
  CLOB_ENDPOINT: 'https://clob.polymarket.com',
  DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
  GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
  CLOB_RELAYER:
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? 'https://predict.dev-api.cx.metamask.io'
      : 'https://predict.api.cx.metamask.io',
});

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

export const deriveApiKey = async ({ address }: { address: string }) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();
  const headers = await getL1Headers({ address });
  const response = await fetch(`${CLOB_ENDPOINT}/auth/derive-api-key`, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to derive API key');
  }
  const apiKeyRaw = await response.json();
  return apiKeyRaw as ApiKeyCreds;
};

export const createApiKey = async ({ address }: { address: string }) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();
  const headers = await getL1Headers({ address });
  const response = await fetch(`${CLOB_ENDPOINT}/auth/api-key`, {
    method: 'POST',
    headers,
    body: '',
  });
  if (response.status === 400) {
    return await deriveApiKey({ address });
  }
  const apiKeyRaw = await response.json();
  return apiKeyRaw as ApiKeyCreds;
};

export const priceValid = (price: number, tickSize: TickSize): boolean =>
  price >= parseFloat(tickSize) && price <= 1 - parseFloat(tickSize);

export const getOrderBook = async ({ tokenId }: { tokenId: string }) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  const response = await fetch(`${CLOB_ENDPOINT}/book?token_id=${tokenId}`, {
    method: 'GET',
  });
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
      return MATIC_CONTRACTS;
    default:
      throw new Error(
        'MetaMask Predict is only supported on Polygon mainnet and Amoy testnet',
      );
  }
};

export const getOrderTypedData = ({
  order,
  chainId,
  verifyingContract,
}: {
  order: OrderData & { salt: string };
  chainId: number;
  verifyingContract: string;
}) => ({
  primaryType: 'Order',
  domain: {
    name: 'Polymarket CTF Exchange',
    version: '1',
    chainId,
    verifyingContract,
  },
  types: {
    EIP712Domain: [
      ...EIP712Domain,
      { name: 'verifyingContract', type: 'address' },
    ],
    Order: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'signer', type: 'address' },
      { name: 'taker', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'makerAmount', type: 'uint256' },
      { name: 'takerAmount', type: 'uint256' },
      { name: 'expiration', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'feeRateBps', type: 'uint256' },
      { name: 'side', type: 'uint8' },
      { name: 'signatureType', type: 'uint8' },
    ],
  },
  message: order,
});

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

export const submitClobOrder = async ({
  headers,
  clobOrder,
  feeAuthorization,
}: {
  headers: ClobHeaders;
  clobOrder: ClobOrderObject;
  feeAuthorization?: SafeFeeAuthorization;
}): Promise<Result<OrderResponse>> => {
  const { CLOB_RELAYER } = getPolymarketEndpoints();
  const url = `${CLOB_RELAYER}/order`;
  const body: ClobOrderObject & { feeAuthorization?: SafeFeeAuthorization } = {
    ...clobOrder,
    feeAuthorization,
  };

  // For our relayer, we need to replace the underscores with dashes
  // since underscores are not standardly allowed in headers
  headers = {
    ...headers,
    ...Object.entries(headers)
      .map(([key, value]) => ({
        [key.replace(/_/g, '-')]: value,
      }))
      .reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 403) {
      return {
        success: false,
        error: 'You are unable to access this provider.',
      };
    }

    let responseData;
    try {
      responseData = (await response.json()) as OrderResponse;
    } catch (error) {
      responseData = undefined;
    }

    if (!response.ok || !responseData || responseData?.success === false) {
      const error = responseData?.errorMsg ?? response.statusText;
      return {
        success: false,
        error,
      };
    }

    return { success: true, response: responseData };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to submit CLOB order: ${msg}`,
    };
  }
};

export const isSportEvent = (event: PolymarketApiEvent): boolean =>
  (Array.isArray(event.tags) ? event.tags : []).some(
    (tag) => tag.slug === 'sports',
  );

export const isSpreadMarket = (market: PolymarketApiMarket): boolean =>
  market.sportsMarketType?.toLowerCase().includes('spread') ?? false;

export const isMoneylineMarket = (market: PolymarketApiMarket): boolean =>
  market.sportsMarketType?.toLowerCase() === 'moneyline';
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

/**
 * Get the sort priority for a sports market type
 * moneyline: 0, spreads: 1, totals: 2, others: 3 (then alphabetically)
 */
const getSportsMarketTypePriority = (type: string): number => {
  const priorities: Record<string, number> = {
    moneyline: 0,
    spreads: 1,
    totals: 2,
  };
  return priorities[type.toLowerCase()] ?? 3;
};

const formatMarketGroupItemTitle = (market: PolymarketApiMarket): string => {
  if (isSpreadMarket(market)) {
    // Remove the dash before the spread number (e.g., "FC-Dallas -3.5" → "FC-Dallas 3.5")
    // Uses negative lookahead to target dash followed by digit, not dashes in team names
    return market.groupItemTitle.replace(/-(?=\d)/, '');
  }

  if (isMoneylineMarket(market)) {
    return market.groupItemTitle || market.question;
  }
  return market.groupItemTitle;
};

const formatOutcomeTitles = (market: PolymarketApiMarket): string[] => {
  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
  if (isSpreadMarket(market)) {
    const line = market.line ? Math.abs(market.line) : 0;
    return outcomes.map((outcome: string, index: number) =>
      line ? `${outcome} ${index > 0 ? `+${line}` : `-${line}`}` : outcome,
    );
  }
  return outcomes;
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

const parsePolymarketMarketOutcomes = (
  market: PolymarketApiMarket,
  event: PolymarketApiEvent,
): PredictOutcomeToken[] => {
  const outcomeTokensIds = market.clobTokenIds
    ? JSON.parse(market.clobTokenIds)
    : [];
  const outcomes = formatOutcomeTitles(market);
  const outcomePrices = market.outcomePrices
    ? JSON.parse(market.outcomePrices)
    : [];
  const outcomeTokens = outcomeTokensIds.map(
    (tokenId: string, index: number) => ({
      id: tokenId,
      title: outcomes[index],
      price: parseFloat(outcomePrices[index]),
    }),
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
export const sortSportMarkets = (
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

export const sortMarkets = (
  event: PolymarketApiEvent,
  sortBy?: 'price' | 'ascending' | 'descending',
): PolymarketApiMarket[] => {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const eventSortBy = event.sortBy;

  if (sortBy) {
    return sortMarketsByField(markets, sortBy);
  }

  if (eventSortBy) {
    return sortMarketsByField(markets, eventSortBy);
  }

  if (isSportEvent(event)) {
    return sortSportMarkets(markets);
  }

  return markets;
};

export const parsePolymarketMarket = (
  market: PolymarketApiMarket,
  event: PolymarketApiEvent,
): PredictOutcome => ({
  id: market.conditionId,
  providerId: 'polymarket',
  marketId: event.id,
  title: market.question,
  description: market.description,
  image: market.icon ?? market.image,
  groupItemTitle: formatMarketGroupItemTitle(market),
  status: market.closed ? PredictMarketStatus.CLOSED : PredictMarketStatus.OPEN,
  volume: market.volumeNum ?? 0,
  tokens: parsePolymarketMarketOutcomes(market, event),
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

  const { category, teamLookup } = options;
  const sortBy = options.sortMarketsBy ?? sortMarketsBy;

  const parsedMarkets: PredictMarket[] = events.map(
    (event: PolymarketApiEvent) => {
      const tags = Array.isArray(event.tags) ? event.tags : [];
      const eventLeague = getEventLeague(event);

      const markets = sortMarkets(event, sortBy).filter(
        (market: PolymarketApiMarket) => market?.active !== false,
      );

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

      return {
        id: event.id,
        slug: event.slug,
        providerId: 'polymarket',
        title: event.title,
        description: event.description,
        image: event.icon,
        status: event.closed
          ? PredictMarketStatus.CLOSED
          : PredictMarketStatus.OPEN,
        recurrence: getRecurrence(event.series),
        endDate: event.endDate,
        category,
        tags: tags.map((t) => t.label),
        outcomes: markets.map((market: PolymarketApiMarket) =>
          parsePolymarketMarket(market, event),
        ),
        liquidity: event.liquidity,
        volume: event.volume,
        game,
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
      providerId: 'polymarket',
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

export interface GetParsedMarketsOptions extends GetMarketsParams {
  teamLookup?: PolymarketTeamLookupFn;
}

export const getParsedMarketsFromPolymarketApi = async (
  params?: GetParsedMarketsOptions,
): Promise<PredictMarket[]> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

  const {
    category = 'trending',
    q,
    limit = 20,
    offset = 0,
    teamLookup,
  } = params || {};
  DevLogger.log(
    'Getting markets via Polymarket API for category:',
    category,
    'search:',
    q,
    'limit:',
    limit,
    'offset:',
    offset,
  );

  const limitParam = `limit=${limit}`;
  const active = `active=true`;
  const archived = `archived=false`;
  const closed = `closed=false`;
  const ascending = `ascending=false`;
  const offsetParam = `offset=${offset}`;
  const volume = `volume_min=${10000.0}`;
  const liquidity = `liquidity_min=${10000.0}`;

  let queryParamsEvents = `${limitParam}&${active}&${archived}&${closed}&${ascending}&${offsetParam}&${liquidity}&${volume}`;

  const categoryTagMap: Record<PredictCategory, string> = {
    trending: '&exclude_tag_id=100639&order=volume24hr',
    new: '&order=startDate&exclude_tag_id=100639&exclude_tag_id=102169',
    sports: '&tag_slug=sports&&exclude_tag_id=100639&order=volume24hr',
    crypto: '&tag_slug=crypto&order=volume24hr',
    politics: '&tag_slug=politics&order=volume24hr',
  };

  queryParamsEvents += categoryTagMap[category];

  const limitPerType = `limit_per_type=${limit}`;
  const type = `type=events`;
  const eventsStatus = `events_status=active`;
  const sort = `sort=volume_24hr`;
  const presetsTitle = `presets=EventsTitle`;
  const page = `page=${Math.floor(offset / limit) + 1}`;

  const queryParamsSearch = `${type}&${eventsStatus}&${sort}&${presetsTitle}&${limitPerType}&${page}`;

  const endpoint = q
    ? `${GAMMA_API_ENDPOINT}/public-search?q=${encodeURIComponent(
        q,
      )}&${queryParamsSearch}`
    : `${GAMMA_API_ENDPOINT}/events/pagination?${queryParamsEvents}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error('Failed to get markets');
  }
  const data = await response.json();

  const eventsData = q ? data?.events : data?.data;
  const events: PolymarketApiEvent[] = Array.isArray(eventsData)
    ? eventsData
    : [];

  const parsedMarkets: PredictMarket[] = parsePolymarketEvents(events, {
    category,
    sortMarketsBy: 'price',
    teamLookup,
  });

  if (q) {
    return parsedMarkets.filter((m) => m.outcomes.length > 0);
  }

  return parsedMarkets;
};

export const getMarketsFromPolymarketApi = async ({
  conditionIds,
}: {
  conditionIds: string[];
}) => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const queryParams = conditionIds.map((id) => `condition_ids=${id}`).join('&');
  const response = await fetch(`${GAMMA_API_ENDPOINT}/markets?${queryParams}`);
  if (!response.ok) {
    throw new Error('Failed to get market');
  }
  const responseData = await response.json();
  const market = responseData;
  return market as PolymarketApiMarket[];
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

export const parsePolymarketPositions = async ({
  positions,
}: {
  positions: PolymarketPosition[];
}) => {
  const parsedPositions: PredictPosition[] = positions.map(
    (position: PolymarketPosition) => ({
      id: position.asset,
      providerId: 'polymarket',
      marketId: position.eventId,
      outcomeId: position.conditionId,
      outcome: position.outcome,
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
  return slugs?.some((slug) => waiveList.includes(slug)) ?? false;
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
    };
  }

  const totalFeePercentage =
    (feeCollection.metamaskFee + feeCollection.providerFee) * 100;

  let metamaskFee = userBetAmount * feeCollection.metamaskFee;
  let providerFee = userBetAmount * feeCollection.providerFee;

  // Round to 3 decimals
  metamaskFee = Math.round(metamaskFee * 1000) / 1000;
  providerFee = Math.round(providerFee * 1000) / 1000;

  // Rounded to 4 decimals
  const totalFee = metamaskFee + providerFee;

  return {
    metamaskFee,
    providerFee,
    totalFee,
    totalFeePercentage,
    collector: feeCollection.collector,
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

  // Decode the result
  const allowance = BigInt(res);
  return allowance;
};

export const getIsApprovedForAll = async ({
  owner,
  operator,
}: {
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

  // Get the conditional tokens contract address
  const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);

  // Encode the isApprovedForAll function call
  const data = new Interface([
    'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  ]).encodeFunctionData('isApprovedForAll', [owner, operator]);

  // Make the contract call
  const res = await query(ethQuery, 'call', [
    {
      to: contractConfig.conditionalTokens,
      data,
    },
  ]);

  // Decode the result - convert hex to boolean
  const isApproved = BigInt(res) !== 0n;
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

export const getBalance = async ({
  address,
}: {
  address: string;
}): Promise<number> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Get the collateral token contract address
  const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);

  // Encode the balanceOf function call
  const data = new Interface([
    'function balanceOf(address account) external view returns (uint256)',
  ]).encodeFunctionData('balanceOf', [address]);

  // Make the contract call
  const res = await query(ethQuery, 'call', [
    {
      to: contractConfig.collateral,
      data,
    },
  ]);

  // Decode the result and convert to USDC (6 decimals)
  const balance = Number(BigInt(res)) / 10 ** COLLATERAL_TOKEN_DECIMALS;
  return balance;
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
  },
): Promise<OrderPreview> => {
  const { marketId, outcomeId, outcomeTokenId, side, size, feeCollection } =
    params;
  const book = await getOrderBook({ tokenId: outcomeTokenId });
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
    return {
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
      fees: await calculateFees({
        feeCollection,
        marketId,
        userBetAmount: size,
      }),
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
    // no fees for sell orders
  };
};
