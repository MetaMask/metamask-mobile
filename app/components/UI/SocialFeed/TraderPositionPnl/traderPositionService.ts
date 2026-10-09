import { hexToNumber, isHexString, type Hex } from '@metamask/utils';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import { buildEvmCaip19AssetId } from '../../../../util/multichain/buildEvmCaip19AssetId';
import type { TraderPosition, TraderPositionTrade } from './types';

/**
 * ASSETS-4023 names an open-positions endpoint for the wallet's line.
 * This call loads one position by id (`GET /api/v1/traders/position/{id}`).
 * The token-details line loads one wallet's open position with
 * `GET /api/v1/accounts/{caip10}/assets/{caip19}/open-position-pnl`.
 * The asset id is CAIP-19, with the `/` percent-encoded in the path.
 *
 * Draft for @social-ai-team (ASSETS-4073). Not sent.
 * Spot: is unrealized currentValueUSD minus costBasis? Verified payload has realized plus unrealized equal to pnlValueUsd.
 * Cost basis: does costBasis always cover the full remaining positionAmount? Position bd632f1d has positionAmount 90.0037 but costBasis equals only the last buy (87999.999999).
 * Perps (out of V1): what is the formula for leveraged positions and shorts (costBasisWithLeverage, sign, percent base)?
 * Coverage: does the endpoint return positions for every MetaMask wallet, or only wallets the social indexer tracks?
 */

/** Non-2xx response from the position endpoint. `status` is 401, 404, or other. */
export class TraderPositionHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Social position request failed: ${status}`);
    this.name = 'TraderPositionHttpError';
    this.status = status;
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
  };
};

const socialApiBase = (): string =>
  AppConstants.SOCIAL_API_URL.replace(/\/$/, '');

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const bearerToken = (): Promise<string> =>
  Engine.controllerMessenger.call('AuthenticationController:getBearerToken');

const evmChainReference = (chainId: string): string | null => {
  if (isHexString(chainId)) {
    return String(hexToNumber(chainId));
  }
  const match = /^eip155:(\d+)$/i.exec(chainId);
  return match?.[1] ?? null;
};

/** CAIP-10 account and CAIP-19 asset for the open-position PnL route. */
export const openPositionCaipIds = (
  accountAddress: string,
  tokenAddress: string,
  chainId: string | undefined,
): { account: string; asset: string } | null => {
  if (chainId == null) {
    return null;
  }
  const reference = evmChainReference(chainId);
  if (reference == null) {
    return null;
  }
  const asset = isHexString(chainId)
    ? buildEvmCaip19AssetId(tokenAddress, chainId as Hex)
    : `eip155:${reference}/erc20:${tokenAddress.toLowerCase()}`;
  return {
    account: `eip155:${reference}:${accountAddress.toLowerCase()}`,
    asset,
  };
};

const readFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const positionFromOpenPnl = (
  body: Record<string, unknown>,
  tokenAddress: string,
  chainId: string,
): TraderPosition => {
  const stats = body.positionStats;
  if (!isRecord(stats) || typeof stats.isOpen !== 'boolean') {
    throw new TraderPositionMalformedError();
  }
  const positionAmount = readFiniteNumber(body.positionAmount);
  if (positionAmount == null) {
    throw new TraderPositionMalformedError();
  }
  const positionId = typeof body.positionId === 'string' ? body.positionId : '';
  const firstTrade = Number(positionId);
  const trades: TraderPositionTrade[] =
    Number.isFinite(firstTrade) && firstTrade > 0
      ? [{ timestamp: firstTrade }]
      : [];

  return {
    positionId,
    tokenSymbol: '',
    tokenName: '',
    tokenAddress,
    chain: chainId,
    isOpen: stats.isOpen,
    positionAmount,
    costBasis: requireNumber(stats.holdingsCostBasisUSD),
    currentValueUSD: null,
    realizedPnl: requireNumber(stats.realizedGainsUSD),
    pnlValueUsd: null,
    pnlPercent: null,
    boughtUsd: requireNumber(stats.boughtUSD),
    soldUsd: requireNumber(stats.soldUSD),
    perpPositionType: null,
    perpLeverage: null,
    positionAmountWithLeverage: null,
    costBasisWithLeverage: null,
    marginUsd: null,
    trades,
    lastTradeAt: trades[0]?.timestamp ?? 0,
  };
};

const positionUrl = (positionId: string): string =>
  `${socialApiBase()}/api/v1/traders/position/${encodeURIComponent(positionId)}`;

export interface GetOpenPositionPnlArgs {
  accountAddress: string;
  tokenAddress: string;
  chainId?: string;
  signal?: AbortSignal;
}

/**
 * Open position for this wallet and token.
 * `GET /api/v1/accounts/{caip10}/assets/{caip19}/open-position-pnl`.
 * Returns null when the wallet has no open position, or its PnL is still backfilling.
 */
export const getOpenPositionPnl = async ({
  accountAddress,
  tokenAddress,
  chainId,
  signal,
}: GetOpenPositionPnlArgs): Promise<TraderPosition | null> => {
  const ids = openPositionCaipIds(accountAddress, tokenAddress, chainId);
  if (ids == null || chainId == null) {
    return null;
  }

  const url = `${socialApiBase()}/api/v1/accounts/${encodeURIComponent(ids.account)}/assets/${encodeURIComponent(ids.asset)}/open-position-pnl`;
  const token = await bearerToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const body = await readJson(response);

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new TraderPositionHttpError(response.status);
  }
  if (!isRecord(body)) {
    throw new TraderPositionMalformedError();
  }
  if (body.pnlStatus === 'backfilling') {
    return null;
  }
  return positionFromOpenPnl(body, tokenAddress, chainId);
};

/**
 * Loads one trader position.
 *
 * Auth is the same bearer token SocialService sends
 * (`AuthenticationController:getBearerToken`). The host comes from
 * `SOCIAL_API_URL`. Pass `signal` to cancel the request.
 */
export const getTraderPosition = async (
  positionId: string,
  signal?: AbortSignal,
): Promise<TraderPosition> => {
  const url = positionUrl(positionId);
  const token = await bearerToken();

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new TraderPositionHttpError(response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new TraderPositionMalformedError();
  }

  return toTraderPosition(body);
};
