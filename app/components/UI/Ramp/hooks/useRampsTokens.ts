import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectTokens,
  selectTokensRequest,
} from '../../../../selectors/rampsController';
import {
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
}

/**
 * Hook to get tokens state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @param region - Optional region code to use for request state. If not provided, uses userRegion from state.
 * @param action - Optional action type ('buy' or 'sell'). Defaults to 'buy'.
 * @returns Tokens state.
 */
export function useRampsTokens(
  region?: string,
  action: 'buy' | 'sell' = 'buy',
): UseRampsTokensResult {
  const tokens = useSelector(selectTokens);
  const userRegion = useSelector(
    (state: Parameters<typeof selectTokens>[0]) =>
      state.engine.backgroundState.RampsController?.userRegion,
  );

  const regionCode = useMemo(
    () => region ?? userRegion?.regionCode ?? '',
    [region, userRegion?.regionCode],
  );

  const requestSelector = useMemo(
    () => selectTokensRequest(regionCode, action),
    [regionCode, action],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<TokensResponse>;

  return {
    tokens,
    isLoading: isFetching,
    error,
  };
}

export default useRampsTokens;
