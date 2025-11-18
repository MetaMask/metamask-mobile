import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import {
  getRampRoutingDecision,
  getDetectedGeolocation,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';

const SDK_VERSION = '2.1.5';

const TOKEN_API_URL = {
  STAGING: 'https://on-ramp-cache.uat-api.cx.metamask.io',
  PRODUCTION: 'https://on-ramp-cache.api.cx.metamask.io',
} as const;

/**
 * Determines the base URL for the token cache API based on the MetaMask environment.
 *
 * @returns The base URL for production or staging environment
 */
function getBaseUrl(): string {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  const isProduction =
    metamaskEnvironment === 'production' ||
    metamaskEnvironment === 'beta' ||
    metamaskEnvironment === 'rc';

  return isProduction ? TOKEN_API_URL.PRODUCTION : TOKEN_API_URL.STAGING;
}

export interface RampsToken extends DepositCryptoCurrency {
  tokenSupported: boolean;
}

interface TokenCacheAPIResponse {
  topTokens: RampsToken[];
  allTokens: RampsToken[];
}

export interface UseRampTokensResult {
  topTokens: RampsToken[] | null;
  allTokens: RampsToken[] | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch available tokens for ramp flows based on user region and routing decision.
 *
 * @returns An object containing top tokens, all tokens, loading state, and error state
 */
export function useRampTokens(): UseRampTokensResult {
  const [topTokens, setTopTokens] = useState<RampsToken[] | null>(null);
  const [allTokens, setAllTokens] = useState<RampsToken[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const detectedGeolocation = useSelector(getDetectedGeolocation);

  const fetchTokens = useCallback(async () => {
    // Don't fetch if no region detected
    if (!detectedGeolocation) {
      setTopTokens(null);
      setAllTokens(null);
      setIsLoading(false);
      return;
    }

    // Don't fetch for invalid routing decisions
    if (
      !rampRoutingDecision ||
      rampRoutingDecision === UnifiedRampRoutingType.UNSUPPORTED ||
      rampRoutingDecision === UnifiedRampRoutingType.ERROR
    ) {
      setTopTokens(null);
      setAllTokens(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Determine base URL based on environment
      const baseUrl = getBaseUrl();

      // Map routing decision to action parameter
      const action =
        rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR
          ? 'buy'
          : 'deposit';

      // Build URL using URL and searchParams
      const url = new URL(`/regions/${detectedGeolocation}/tokens`, baseUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('sdk', SDK_VERSION);

      // Fetch tokens from API
      const response = (await handleFetch(
        url.toString(),
      )) as TokenCacheAPIResponse;

      setTopTokens(response.topTokens);
      setAllTokens(response.allTokens);
    } catch (requestError) {
      const errorObject = requestError as Error;
      setError(errorObject);
      Logger.error(errorObject, 'useRampTokens::fetchTokens failed');
    } finally {
      setIsLoading(false);
    }
  }, [detectedGeolocation, rampRoutingDecision]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { topTokens, allTokens, isLoading, error };
}
