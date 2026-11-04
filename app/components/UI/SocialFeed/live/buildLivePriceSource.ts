import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { Position } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { chainNameToId } from '../utils/chainMapping';
import {
  getPerpPositionDirection,
  getSupportedXyzPerpMarketSymbol,
  isPerpPosition,
} from '../utils/perp';
import type { SocialLivePriceSource } from './types';

const isPresentNumber = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);

export interface LivePriceDerivedFigures {
  snapshotPrice: number | null;
  entryPrice: number | null;
  marketCapPerPrice: number | null;
}

const toSpotAssetId = (core: Position): CaipAssetType | undefined => {
  const chainId = chainNameToId(core.chain);
  const address = core.tokenAddress?.trim();
  if (!chainId || !address) {
    return undefined;
  }
  try {
    return formatAddressToAssetId(address, chainId);
  } catch {
    // Chains without a known native asset throw; they have no market-data
    // channel either.
    return undefined;
  }
};

/**
 * What the API's P&L percent divides by. Read back off the API's own pair when
 * it sent both, so a live percent continues the snapshot's rather than
 * switching basis on the first tick.
 */
const derivePnlBaseUsd = (core: Position): number | null => {
  const { pnlValueUsd, pnlPercent, boughtUsd, costBasis } = core;
  if (
    isPresentNumber(pnlValueUsd) &&
    isPresentNumber(pnlPercent) &&
    pnlValueUsd !== 0 &&
    pnlPercent !== 0
  ) {
    return Math.abs(pnlValueUsd / (pnlPercent / 100));
  }
  if (isPresentNumber(boughtUsd) && boughtUsd !== 0) {
    return Math.abs(boughtUsd);
  }
  if (isPresentNumber(costBasis) && costBasis > 0) {
    return costBasis;
  }
  return null;
};

/**
 * Describes how an open feed position's figures follow a streamed price.
 * Returns `undefined` for closed positions and for assets no stream can price.
 */
export function buildLivePriceSource(
  core: Position,
  isClosed: boolean,
  derived: LivePriceDerivedFigures,
): SocialLivePriceSource | undefined {
  const positionAmount = Math.abs(core.positionAmount);
  if (isClosed || !(positionAmount > 0)) {
    return undefined;
  }

  const shared = {
    positionAmount,
    snapshotPrice: derived.snapshotPrice,
    snapshotPnlUsd: isPresentNumber(core.pnlValueUsd) ? core.pnlValueUsd : null,
    entryPrice: derived.entryPrice,
    pnlBaseUsd: derivePnlBaseUsd(core),
  };

  if (isPerpPosition(core)) {
    const { targetSymbol } = getSupportedXyzPerpMarketSymbol(core.tokenSymbol);
    if (!targetSymbol) {
      return undefined;
    }
    return {
      ...shared,
      key: `perp:${targetSymbol}`,
      kind: 'perp',
      symbol: targetSymbol,
      direction: getPerpPositionDirection(core) === 'short' ? -1 : 1,
      marketCapPerPrice: null,
    };
  }

  const assetId = toSpotAssetId(core);
  if (!assetId) {
    return undefined;
  }
  return {
    ...shared,
    key: `spot:${assetId}`,
    kind: 'spot',
    assetId,
    direction: 1,
    marketCapPerPrice: derived.marketCapPerPrice,
  };
}
