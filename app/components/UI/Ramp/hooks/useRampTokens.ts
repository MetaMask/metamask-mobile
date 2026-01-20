import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { useRampsController } from './useRampsController';
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
  const [rawTopTokens, setRawTopTokens] = useState<RampsToken[] | null>(null);
  const [rawAllTokens, setRawAllTokens] = useState<RampsToken[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const { userRegion } = useRampsController();
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const regionCode = userRegion?.regionCode;

  const fetchTokens = useCallback(async () => {
    // Don't fetch if no region detected
    if (!regionCode) {
      setRawTopTokens(null);
      setRawAllTokens(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Don't fetch for invalid routing decisions
    if (
      !rampRoutingDecision ||
      rampRoutingDecision === UnifiedRampRoutingType.UNSUPPORTED ||
      rampRoutingDecision === UnifiedRampRoutingType.ERROR
    ) {
      setRawTopTokens(null);
      setRawAllTokens(null);
      setIsLoading(false);
      setError(null);
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
      const url = new URL(`/regions/${regionCode}/tokens`, baseUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('sdk', SDK_VERSION);

      // Fetch tokens from API
      const response = (await handleFetch(
        url.toString(),
      )) as TokenCacheAPIResponse;

      setRawTopTokens(response.topTokens);
      setRawAllTokens(response.allTokens);
    } catch (requestError) {
      const errorObject = requestError as Error;
      setError(errorObject);
      Logger.error(errorObject, 'useRampTokens::fetchTokens failed');
    } finally {
      setIsLoading(false);
    }
  }, [regionCode, rampRoutingDecision]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Filter tokens to only include those for networks the user has added
  const topTokens = useMemo(() => {
    if (!rawTopTokens) return null;

    return rawTopTokens.filter((token) => {
      if (!token.chainId) return false;
      return networksByCaipChainId[token.chainId] !== undefined;
    });
  }, [rawTopTokens, networksByCaipChainId]);

  const allTokens = useMemo(() => {
    if (!rawAllTokens) return null;

    return rawAllTokens.filter((token) => {
      if (!token.chainId) return false;
      return networksByCaipChainId[token.chainId] !== undefined;
    });
  }, [rawAllTokens, networksByCaipChainId]);

  return { topTokens, allTokens, isLoading, error };
}
