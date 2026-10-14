import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import { selectSentinelFeeTokensCacheTtlMs } from '../../../../selectors/bridge/featureFlags';
import type { SentinelFeeTokensByChain } from '../api/sentinelFeeTokens';
import { sentinelFeeTokensQueries } from '../queries/sentinelFeeTokens';
import { validateSentinelFeeTokenPair } from '../utils/validateSentinelFeeTokenPair';

export type SentinelFeeTokenValidationReason =
  | 'incomplete-inputs'
  | 'loading'
  | 'unavailable'
  | 'unsupported-pair';

export type SentinelFeeTokenValidationResult =
  | {
      isValid: true;
      reason?: never;
      retry: () => void;
    }
  | {
      isValid: false;
      reason: SentinelFeeTokenValidationReason;
      retry: () => void;
    };

interface UseSentinelFeeTokenValidationParams {
  chainId?: CaipChainId;
  sourceAssetId?: CaipAssetType;
  destinationAssetId?: CaipAssetType;
}

/**
 * Validates an order pair against Sentinel's shared fee-token list.
 *
 * @param params - CAIP identifiers for the order chain and token pair.
 * @returns Validation state and a retry callback for cold fetch failures.
 */
export function useSentinelFeeTokenValidation({
  chainId,
  sourceAssetId,
  destinationAssetId,
}: UseSentinelFeeTokenValidationParams): SentinelFeeTokenValidationResult {
  const cacheTtlMs = useSelector(selectSentinelFeeTokensCacheTtlMs);
  const descriptor = sentinelFeeTokensQueries.getSentinelFeeTokens(cacheTtlMs);
  const hasCompleteInputs = Boolean(
    chainId && sourceAssetId && destinationAssetId,
  );
  const { data, isError, refetch } = useQuery<SentinelFeeTokensByChain>({
    queryKey: descriptor.queryKey,
    enabled: hasCompleteInputs,
  });
  const retry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  useEffect(() => {
    if (!hasCompleteInputs) {
      return;
    }

    refetch({ cancelRefetch: false }).catch(() => undefined);
  }, [
    cacheTtlMs,
    chainId,
    destinationAssetId,
    hasCompleteInputs,
    refetch,
    sourceAssetId,
  ]);

  if (!chainId || !sourceAssetId || !destinationAssetId) {
    return {
      isValid: false,
      reason: 'incomplete-inputs',
      retry,
    };
  }

  if (data) {
    const isValid = validateSentinelFeeTokenPair({
      sentinelFeeTokens: data,
      chainId,
      sourceAssetId,
      destinationAssetId,
    });

    return isValid
      ? { isValid: true, retry }
      : { isValid: false, reason: 'unsupported-pair', retry };
  }

  if (isError) {
    return {
      isValid: false,
      reason: 'unavailable',
      retry,
    };
  }

  return {
    isValid: false,
    reason: 'loading',
    retry,
  };
}
