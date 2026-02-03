import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectTokens } from '../../../../selectors/rampsController';
import {
  type RampsToken,
  type TokensResponse,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

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
  selectedToken: RampsToken | null;
  /**
   * Sets the selected token by asset ID.
   * @param token - The token to select, or null to clear selection.
   */
  setSelectedToken: (token: RampsToken | null) => void;
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
  const {
    data: tokens,
    selected: selectedToken,
    isLoading,
    error,
  } = useSelector(selectTokens);

  const setSelectedToken = useCallback(
    (token: RampsToken | null) =>
      Engine.context.RampsController.setSelectedToken(token?.assetId),
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
