import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectTokens,
  selectTokensLoading,
  selectTokensError,
  selectSelectedToken,
} from '../../../../selectors/rampsController';
import { type RampsControllerState } from '@metamask/ramps-controller';
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
   * @param assetId - The asset identifier in CAIP-19 format (e.g., "eip155:1/erc20:0x...")
   */
  setSelectedToken: (assetId?: string) => void;
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
 * @returns Tokens state.
 */
export function useRampsTokens(): UseRampsTokensResult {
  const tokens = useSelector(selectTokens);
  const selectedToken = useSelector(selectSelectedToken);
  const isLoading = useSelector(selectTokensLoading);
  const error = useSelector(selectTokensError);

  const setSelectedToken = useCallback(
    (assetId?: string) =>
      Engine.context.RampsController.setSelectedToken(assetId),
    [],
  );

  return {
    tokens,
    selectedToken,
    setSelectedToken,
    isLoading,
    error,
  };
}

export default useRampsTokens;
