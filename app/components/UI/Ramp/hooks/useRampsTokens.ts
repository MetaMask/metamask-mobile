import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectTokens,
  selectTokensRequest,
} from '../../../../selectors/rampsController';
import {
  ExecuteRequestOptions,
  RequestSelectorResult,
  type RampsControllerState,
} from '@metamask/ramps-controller';

type TokensResponse = NonNullable<RampsControllerState['tokens']>;

/**
 * Result returned by the useRampsTokens hook.
 */
export interface UseRampsTokensResult {
  /**
   * The tokens response containing topTokens and allTokens, or null if not loaded.
   */
  tokens: TokensResponse | null;
  /**
   * Whether the tokens request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Fetch tokens for a given region and action.
   */
  fetchTokens: (
    region?: string,
    action?: 'buy' | 'sell',
    options?: ExecuteRequestOptions & {
      provider?: string | string[];
    },
  ) => Promise<TokensResponse>;
}

/**
 * Hook to get tokens state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @param region - Optional region code to use for request state. If not provided, uses userRegion from state.
 * @param action - Optional action type ('buy' or 'sell'). Defaults to 'buy'.
 * @param provider - Optional provider ID(s) to filter by.
 * @returns Tokens state and fetch function.
 */
export function useRampsTokens(
  region?: string,
  action: 'buy' | 'sell' = 'buy',
  provider?: string | string[],
): UseRampsTokensResult {
  const tokens = useSelector(selectTokens);
  const userRegion = useSelector(
    (state: Parameters<typeof selectTokens>[0]) =>
      state.engine.backgroundState.RampsController?.userRegion,
  );

  const regionToUse = useMemo(
    () => region ?? userRegion?.regionCode ?? '',
    [region, userRegion?.regionCode],
  );

  const requestSelector = useMemo(
    () => selectTokensRequest(regionToUse, action, provider),
    [regionToUse, action, provider],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<TokensResponse>;

  const fetchTokens = useCallback(
    async (
      fetchRegion?: string,
      fetchAction: 'buy' | 'sell' = action,
      options?: ExecuteRequestOptions & {
        provider?: string | string[];
      },
    ) =>
      await Engine.context.RampsController.getTokens(
        fetchRegion ?? regionToUse,
        fetchAction,
        options,
      ),
    [action, regionToUse],
  );

  return {
    tokens,
    isLoading: isFetching,
    error,
    fetchTokens,
  };
}

export default useRampsTokens;
