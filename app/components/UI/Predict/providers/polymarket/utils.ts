import { SignTypedDataVersion } from '@metamask/keyring-controller';

import { Hex, hexToNumber } from '@metamask/utils';
import { Interface, parseUnits } from 'ethers/lib/utils';
import Engine from '../../../../../core/Engine';
import {
  Side,
  type PredictCategory,
  type PredictMarket,
  type PredictMarketStatus,
  type PredictPosition,
  type Recurrence,
} from '../../types';
import { getRecurrenceDisplay } from '../../utils/format';
import {
  ClobAuthDomain,
  EIP712Domain,
  MATIC_CONTRACTS,
  MSG_TO_SIGN,
  POLYGON_MAINNET_CHAIN_ID,
} from './constants';
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
  OrderType,
  PolymarketApiEvent,
  PolymarketApiMarket,
  PolymarketPosition,
  RoundConfig,
  SignatureType,
  TickSize,
  TickSizeResponse,
  UserMarketOrder,
  UtilsSide,
} from './types';
import { GetMarketsParams } from '../types';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

export const getPolymarketEndpoints = () => ({
  GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
  CLOB_ENDPOINT: 'https://clob.polymarket.com',
  DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
  GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
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
  // @ts-expect-error - createHmac is not available in the type definitions
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

export const getTickSize = async ({ tokenId }: { tokenId: string }) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  const response = await fetch(
    `${CLOB_ENDPOINT}/tick-size?token_id=${tokenId}`,
    {
      method: 'GET',
    },
  );
  const responseData = await response.json();
  return responseData as TickSizeResponse;
};

export const getOrderBook = async ({ tokenId }: { tokenId: string }) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  const response = await fetch(`${CLOB_ENDPOINT}/book?token_id=${tokenId}`, {
    method: 'GET',
  });
  const responseData = await response.json();
  return responseData;
};

/**
 * calculateBuyMarketPrice calculates the market price to buy a $$ amount
 * @param positions
 * @param amountToMatch worth to buy
 * @returns
 */
export const calculateBuyMarketPrice = (
  positions: OrderSummary[],
  amountToMatch: number,
  orderType: OrderType,
) => {
  if (!positions.length) {
    throw new Error('no match');
  }
  let sum = 0;
  /*
  Asks:
  [
      { price: '0.6', size: '100' },
      { price: '0.55', size: '100' },
      { price: '0.5', size: '100' }
  ]
  So, if the amount to match is $150 that will be reached at first position so price will be 0.6
  */
  for (let i = positions.length - 1; i >= 0; i--) {
    const p = positions[i];
    sum += parseFloat(p.size) * parseFloat(p.price);
    if (sum >= amountToMatch) {
      return parseFloat(p.price);
    }
  }
  if (orderType === OrderType.FOK) {
    throw new Error('no match');
  }
  return parseFloat(positions[0].price);
};

/**
 * calculateSellMarketPrice calculates the market price to sell a shares
 * @param positions
 * @param amountToMatch sells to share
 * @returns
 */
export const calculateSellMarketPrice = (
  positions: OrderSummary[],
  amountToMatch: number,
  orderType: OrderType,
) => {
  if (!positions.length) {
    throw new Error('no match');
  }
  let sum = 0;
  /*
  Bids:
  [
      { price: '0.4', size: '100' },
      { price: '0.45', size: '100' },
      { price: '0.5', size: '100' }
  ]
  So, if the amount to match is 300 that will be reached at the first position so price will be 0.4
  */
  for (let i = positions.length - 1; i >= 0; i--) {
    const p = positions[i];
    sum += parseFloat(p.size);
    if (sum >= amountToMatch) {
      return parseFloat(p.price);
    }
  }
  if (orderType === OrderType.FOK) {
    throw new Error('no match');
  }
  return parseFloat(positions[0].price);
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

export const calculateMarketPrice = async (
  tokenId: string,
  side: Side,
  size: number,
  orderType: OrderType = OrderType.FOK,
): Promise<number> => {
  const book = await getOrderBook({ tokenId });
  if (!book) {
    throw new Error('no orderbook');
  }
  if (side === Side.BUY) {
    if (!book.asks) {
      throw new Error('no match');
    }
    return calculateBuyMarketPrice(book.asks, size, orderType);
  }
  if (!book.bids) {
    throw new Error('no match');
  }
  return calculateSellMarketPrice(book.bids, size, orderType);
};

export const getMarketOrderRawAmounts = (
  side: Side,
  amount: number,
  price: number,
  roundConfig: RoundConfig,
): { side: UtilsSide; rawMakerAmt: number; rawTakerAmt: number } => {
  // force 2 decimals places
  const rawPrice = roundDown(price, roundConfig.price);

  if (side === Side.BUY) {
    const rawMakerAmt = roundDown(amount, roundConfig.size);
    let rawTakerAmt = rawMakerAmt / rawPrice;
    if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
      rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
      if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
        rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
      }
    }
    return {
      side: UtilsSide.BUY,
      rawMakerAmt,
      rawTakerAmt,
    };
  }
  const rawMakerAmt = roundDown(amount, roundConfig.size);
  let rawTakerAmt = rawMakerAmt * rawPrice;
  if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
    rawTakerAmt = roundUp(rawTakerAmt, roundConfig.amount + 4);
    if (decimalPlaces(rawTakerAmt) > roundConfig.amount) {
      rawTakerAmt = roundDown(rawTakerAmt, roundConfig.amount);
    }
  }

  return {
    side: UtilsSide.SELL,
    rawMakerAmt,
    rawTakerAmt,
  };
};

export const generateSalt = (): Hex =>
  `0x${BigInt(Math.floor(Math.random() * 1000000)).toString(16)}`;

/**
 * Translate simple user market order to args used to generate Orders
 */
export const buildMarketOrderCreationArgs = async ({
  signer,
  maker,
  signatureType,
  userMarketOrder,
  roundConfig,
}: {
  signer: string;
  maker: string;
  signatureType: SignatureType;
  userMarketOrder: UserMarketOrder;
  roundConfig: RoundConfig;
}): Promise<OrderData & { salt: string }> => {
  const { side, rawMakerAmt, rawTakerAmt } = getMarketOrderRawAmounts(
    userMarketOrder.side,
    userMarketOrder.size,
    userMarketOrder.price || 1,
    roundConfig,
  );

  const makerAmount = parseUnits(
    rawMakerAmt.toString(),
    COLLATERAL_TOKEN_DECIMALS,
  ).toString();
  const takerAmount = parseUnits(
    rawTakerAmt.toString(),
    COLLATERAL_TOKEN_DECIMALS,
  ).toString();

  let taker;
  if (typeof userMarketOrder.taker !== 'undefined' && userMarketOrder.taker) {
    taker = userMarketOrder.taker;
  } else {
    taker = '0x0000000000000000000000000000000000000000';
  }

  let feeRateBps;
  if (
    typeof userMarketOrder.feeRateBps !== 'undefined' &&
    userMarketOrder.feeRateBps
  ) {
    feeRateBps = userMarketOrder.feeRateBps.toString();
  } else {
    feeRateBps = '0';
  }

  let nonce;
  if (typeof userMarketOrder.nonce !== 'undefined' && userMarketOrder.nonce) {
    nonce = userMarketOrder.nonce.toString();
  } else {
    nonce = '0';
  }

  return {
    salt: hexToNumber(generateSalt()).toString(),
    maker,
    signer,
    taker,
    tokenId: userMarketOrder.tokenID,
    makerAmount,
    takerAmount,
    expiration: '0',
    nonce,
    feeRateBps,
    side,
    signatureType,
  };
};

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

function replaceAll(s: string, search: string, replace: string) {
  return s.split(search).join(replace);
}

export const submitClobOrder = async ({
  headers,
  clobOrder,
}: {
  headers: ClobHeaders;
  clobOrder: ClobOrderObject;
}) => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();

  const body = JSON.stringify(clobOrder);

  const response = await fetch(`${CLOB_ENDPOINT}/order`, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    if (response.status === 403) {
      return {
        success: false,
        error: 'You are unable to access this provider.',
        errorCode: response.status,
      };
    }
    const responseData = await response.json();
    const error = responseData.error ?? response.statusText;
    return {
      success: false,
      error,
    };
  }

  const responseData = (await response.json()) as OrderResponse;
  return responseData;
};

export const parsePolymarketEvents = (
  events: PolymarketApiEvent[],
  category: PredictCategory,
): PredictMarket[] => {
  const parsedMarkets: PredictMarket[] = events.map(
    (event: PolymarketApiEvent) => ({
      id: event.id,
      slug: event.slug,
      providerId: 'polymarket',
      title: event.title,
      description: event.description,
      image: event.icon,
      status: (event.closed ? 'closed' : 'open') as PredictMarketStatus,
      recurrence: getRecurrenceDisplay(event.series) as Recurrence,
      categories: [category],
      outcomes: event.markets.map((market: PolymarketApiMarket) => {
        const outcomeTokensIds = market.clobTokenIds
          ? JSON.parse(market.clobTokenIds)
          : [];
        const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
        const outcomePrices = market.outcomePrices
          ? JSON.parse(market.outcomePrices)
          : [];
        return {
          id: market.conditionId,
          marketId: event.id,
          title: market.question,
          description: market.description,
          image: market.icon ?? market.image,
          groupItemTitle: market.groupItemTitle,
          status: (market.closed ? 'closed' : 'open') as PredictMarketStatus,
          volume: market.volumeNum ?? 0,
          tokens: outcomeTokensIds.map((tokenId: string, index: number) => ({
            id: tokenId,
            title: outcomes[index],
            price: parseFloat(outcomePrices[index]),
          })),
          negRisk: market.negRisk,
          tickSize: market.orderPriceMinTickSize.toString(),
        };
      }),
    }),
  );
  return parsedMarkets;
};

export const parsePolymarketPositions = ({
  positions,
}: {
  positions: PolymarketPosition[];
}) => {
  const parsedPositions = positions.map((position: PolymarketPosition) => ({
    ...position,
    id: position.asset,
    providerId: 'polymarket',
    // TODO: This is not correct, we need to use the correct market id from the event
    marketId: position.conditionId,
    outcomeId: position.conditionId,
    outcomeTokenId: position.asset,
    amount: position.size,
    price: position.curPrice,
    status: (position.redeemable
      ? 'redeemable'
      : 'open') as PredictPosition['status'],
  }));
  return parsedPositions;
};

export const getMarketsFromPolymarketApi = async (
  params?: GetMarketsParams,
): Promise<PredictMarket[]> => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();

  const { category = 'trending', q, limit = 20, offset = 0 } = params || {};
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

  let queryParamsEvents = `limit=${limit}&active=true&archived=false&closed=false&ascending=false&offset=${offset}`;
  const queryParamsSearch = `limit_per_type=${limit}&page=${
    Math.floor(offset / limit) + 1
  }&ascending=false`;

  const categoryTagMap: Record<PredictCategory, string> = {
    trending: '&exclude_tag_id=100639&order=volume24hr',
    new: '&order=startDate&exclude_tag_id=100639&exclude_tag_id=102169',
    sports: '&tag_slug=sports&&exclude_tag_id=100639&order=volume24hr',
    crypto: '&tag_slug=crypto&order=volume24hr',
    politics: '&tag_slug=politics&order=volume24hr',
  };

  queryParamsEvents += categoryTagMap[category];

  // Use search endpoint if q parameter is provided
  const endpoint = q
    ? `${GAMMA_API_ENDPOINT}/public-search?q=${encodeURIComponent(
        q,
      )}&${queryParamsSearch}`
    : `${GAMMA_API_ENDPOINT}/events/pagination?${queryParamsEvents}`;

  const response = await fetch(endpoint);
  const data = await response.json();

  DevLogger.log('Polymarket response data:', data);

  // Handle different response structures
  const events = q ? data?.events : data?.data;

  if (!events || !Array.isArray(events)) {
    return [];
  }

  const parsedMarkets: PredictMarket[] = parsePolymarketEvents(
    events,
    category,
  );

  return parsedMarkets;
};

export const getMarketFromPolymarketApi = async ({
  conditionId,
}: {
  conditionId: string;
}) => {
  const { GAMMA_API_ENDPOINT } = getPolymarketEndpoints();
  const response = await fetch(
    `${GAMMA_API_ENDPOINT}/markets?condition_ids=${conditionId}`,
  );
  const responseData = await response.json();
  const market = responseData[0];
  return market as PolymarketApiMarket;
};
