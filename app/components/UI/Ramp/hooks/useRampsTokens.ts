import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectTokens,
  selectTokensRequest,
  selectSelectedToken,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import {
  RequestSelectorResult,
  type RampsControllerState,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

type TokensResponse = NonNullable<RampsControllerState['tokens']>;
type SelectedToken = RampsControllerState['selectedToken'];

/**
 * Result returned by the useRampsTokens hook.
 */
export interface UseRampsTokensResult {
  /**
   * The tokens response containing topTokens and allTokens, or null if not loaded.
   */
  tokens: TokensResponse | null;
  /**
   * The currently selected token, or null if none selected.
   */
  selectedToken: SelectedToken;
  /**
   * Sets the selected token by asset ID.
   * @param assetId - The asset identifier in CAIP-19 format (e.g., "eip155:1/erc20:0x...").
   */
  setSelectedToken: (assetId: string) => void;
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
  const selectedToken = useSelector(selectSelectedToken);
  const userRegion = useSelector(selectUserRegion);

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

  const setSelectedToken = useCallback(
    (assetId: string) =>
      Engine.context.RampsController.setSelectedToken(assetId),
    [],
  );

  return {
    tokens,
    selectedToken,
    setSelectedToken,
    isLoading: isFetching,
    error,
  };
}

export default useRampsTokens;
