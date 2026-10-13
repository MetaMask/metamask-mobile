import {
  isCaipAssetType,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import type { SentinelFeeTokensByChain } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPlaceholderSymbol(assetId: string): string {
  return `DUM${assetId.slice(-1)}`;
}

/**
 * Validates the current Sentinel string-array response and normalizes it into
 * the stable token representation used by consumers.
 *
 * @param value - Raw response from `GET /getSentinelFeeTokens`.
 * @returns Sentinel fee tokens grouped by CAIP-2 chain ID.
 * @throws If the response is malformed or contains a token under another
 * chain.
 */
export function parseSentinelFeeTokensResponse(
  value: unknown,
): SentinelFeeTokensByChain {
  if (!isRecord(value)) {
    throw new Error('Invalid Sentinel fee tokens response: expected object');
  }

  const sentinelFeeTokens: SentinelFeeTokensByChain = {};

  for (const [chainId, assetIds] of Object.entries(value)) {
    if (!isCaipChainId(chainId)) {
      throw new Error(
        `Invalid Sentinel fee tokens response: invalid chain ID ${chainId}`,
      );
    }

    if (!Array.isArray(assetIds)) {
      throw new Error(
        `Invalid Sentinel fee tokens response: expected token array for ${chainId}`,
      );
    }

    sentinelFeeTokens[chainId] = assetIds.map((assetId) => {
      if (!isCaipAssetType(assetId)) {
        throw new Error(
          `Invalid Sentinel fee tokens response: invalid asset ID for ${chainId}`,
        );
      }

      if (parseCaipAssetType(assetId).chainId !== chainId) {
        throw new Error(
          `Invalid Sentinel fee tokens response: asset ${assetId} does not belong to ${chainId}`,
        );
      }

      return {
        assetId,
        symbol: getPlaceholderSymbol(assetId),
      };
    });
  }

  return sentinelFeeTokens;
}
