import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type {
  OpenPositionPnl,
  TraderPosition,
  TraderPositionTrade,
} from './types';

/**
 * Two reads:
 * `GET /api/v1/traders/position/{id}` loads one position by id.
 * `GET /api/v2/traders/{wallet}/{assetId}/open` loads the open position one
 * owned wallet holds in one CAIP-19 asset. The wallet must be one the caller
 * holds; a profile id is not accepted.
 */

/** Non-2xx response from the position endpoint. `status` is 401, 404, or other. */
export class TraderPositionHttpError extends Error {
  readonly status: number;

  readonly body: string;

  constructor(status: number, body = '') {
    super(
      body
        ? `Social position request failed: ${status} ${body}`
        : `Social position request failed: ${status}`,
    );
    this.name = 'TraderPositionHttpError';
    this.status = status;
    this.body = body;
  }
}

/** HTTP 200 whose body is not a position. */
export class TraderPositionMalformedError extends Error {
  constructor() {
    super('Social position response was malformed');
    this.name = 'TraderPositionMalformedError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const requireString = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TraderPositionMalformedError();
  }
  return value;
};

const requireNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TraderPositionMalformedError();
  }
  return value;
};

const readNullableNumber = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  return requireNumber(value);
};

const readTrades = (value: unknown): TraderPositionTrade[] => {
  if (!Array.isArray(value)) {
    throw new TraderPositionMalformedError();
  }
  return value.map((trade) => {
    if (!isRecord(trade)) {
      throw new TraderPositionMalformedError();
    }
    return { timestamp: requireNumber(trade.timestamp) };
  });
};

const readPerpSide = (value: unknown): 'long' | 'short' | null => {
  if (value == null) {
    return null;
  }
  if (value === 'long' || value === 'short') {
    return value;
  }
  throw new TraderPositionMalformedError();
};

export const toTraderPosition = (value: unknown): TraderPosition => {
  if (!isRecord(value)) {
    throw new TraderPositionMalformedError();
  }
  if (value.isOpen != null && typeof value.isOpen !== 'boolean') {
    throw new TraderPositionMalformedError();
  }

  return {
    positionId: requireString(value.positionId),
    tokenSymbol: requireString(value.tokenSymbol),
    tokenName: typeof value.tokenName === 'string' ? value.tokenName : '',
    tokenAddress: requireString(value.tokenAddress),
    chain: requireString(value.chain),
    isOpen: value.isOpen !== false,
    positionAmount: requireNumber(value.positionAmount),
    costBasis: requireNumber(value.costBasis),
    currentValueUSD: readNullableNumber(value.currentValueUSD),
    realizedPnl: requireNumber(value.realizedPnl),
    pnlValueUsd: readNullableNumber(value.pnlValueUsd),
    pnlPercent: readNullableNumber(value.pnlPercent),
    boughtUsd: requireNumber(value.boughtUsd),
    soldUsd: requireNumber(value.soldUsd),
    perpPositionType: readPerpSide(value.perpPositionType),
    perpLeverage: readNullableNumber(value.perpLeverage),
    positionAmountWithLeverage: readNullableNumber(
      value.positionAmountWithLeverage,
    ),
    costBasisWithLeverage: readNullableNumber(value.costBasisWithLeverage),
    marginUsd: readNullableNumber(value.marginUsd),
    trades: readTrades(value.trades),
    lastTradeAt: requireNumber(value.lastTradeAt),
    tokenImageUrl:
      typeof value.tokenImageUrl === 'string' ? value.tokenImageUrl : null,
  };
};

export interface OpenPositionMatch {
  pnl: OpenPositionPnl;
  /**
   * Full position row, when the route returns one. The asset open route does
   * not: it has no trade history, so sharing and hold time stay empty.
   */
  position: TraderPosition | null;
}

const socialUrl = (path: string): string => {
  const base = AppConstants.SOCIAL_API_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

const positionUrl = (positionId: string): string =>
  socialUrl(`/api/v1/traders/position/${encodeURIComponent(positionId)}`);

/**
 * One wallet's open position in one asset.
 * `{assetId}` is a CAIP-19 id; the `/` in it is percent-encoded.
 */
export const openPositionUrl = (
  walletAddress: string,
  assetId: string,
): string =>
  socialUrl(
    `/api/v2/traders/${encodeURIComponent(walletAddress)}/${encodeURIComponent(assetId)}/open`,
  );

/**
 * EVM addresses compare case-insensitively. Other chains, including Solana,
 * keep their original casing.
 */
export const tokenAddressesMatch = (left: string, right: string): boolean => {
  if (left.startsWith('0x') || right.startsWith('0x')) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
};

export const findPositionByTokenAddress = (
  positions: TraderPosition[],
  tokenAddress: string,
): TraderPosition | undefined =>
  positions.find((position) =>
    tokenAddressesMatch(position.tokenAddress, tokenAddress),
  );

const fetchSocialJson = async (
  url: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  const token = await Engine.controllerMessenger.call(
    'AuthenticationController:getBearerToken',
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new TraderPositionHttpError(response.status, body);
  }

  try {
    return await response.json();
  } catch {
    throw new TraderPositionMalformedError();
  }
};

const readPnlStatus = (value: unknown): OpenPositionPnl['pnlStatus'] => {
  if (value === 'ready' || value === 'in-progress') {
    return value;
  }
  throw new TraderPositionMalformedError();
};

export const toOpenPositionPnl = (value: unknown): OpenPositionPnl => {
  if (!isRecord(value) || typeof value.isOpen !== 'boolean') {
    throw new TraderPositionMalformedError();
  }

  return {
    positionAmount: requireNumber(value.positionAmount),
    isOpen: value.isOpen,
    boughtUsd: requireNumber(value.boughtUsd),
    soldUsd: requireNumber(value.soldUsd),
    realizedPnl: requireNumber(value.realizedPnl),
    costBasis: requireNumber(value.costBasis),
    currentValueUSD: readNullableNumber(value.currentValueUSD),
    pnlValueUsd: readNullableNumber(value.pnlValueUsd),
    pnlPercent: readNullableNumber(value.pnlPercent),
    pnlStatus: readPnlStatus(value.pnlStatus),
  };
};

/**
 * Loads one trader position by id.
 *
 * Auth is the same bearer token SocialService sends
 * (`AuthenticationController:getBearerToken`). The host comes from
 * `SOCIAL_API_URL`. Pass `signal` to cancel the request.
 */
export const getTraderPosition = async (
  positionId: string,
  signal?: AbortSignal,
): Promise<TraderPosition> =>
  toTraderPosition(await fetchSocialJson(positionUrl(positionId), signal));

/**
 * Loads the open position one owned wallet holds in `assetId`.
 * 404 is "no position" and is thrown for the caller to treat as empty.
 * The body is the PnL payload only: there is no position row to share.
 */
export const getOpenPositionForAsset = async (
  walletAddress: string,
  assetId: string,
  signal?: AbortSignal,
): Promise<OpenPositionMatch> => {
  const url = openPositionUrl(walletAddress, assetId);
  const pnl = toOpenPositionPnl(await fetchSocialJson(url, signal));
  return { pnl, position: null };
};
