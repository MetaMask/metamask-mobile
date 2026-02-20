import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from '../../../../../../selectors/defiPositionsController';
import { selectTokenSortConfig } from '../../../../../../selectors/preferencesController';
import { sortAssets } from '../../../../../UI/Tokens/util';

/**
 * Represents a single DeFi position entry for the homepage.
 * This matches the props expected by DeFiPositionsListItem.
 */
export interface DeFiPositionEntry {
  chainId: Hex;
  protocolId: string;
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
}

export interface UseDeFiPositionsForHomepageResult {
  /** Array of DeFi positions, limited to maxPositions */
  positions: DeFiPositionEntry[];
  /** True when position data is still loading (undefined state) */
  isLoading: boolean;
  /** True when there was an error fetching positions (null state) */
  hasError: boolean;
  /** True when positions loaded successfully but array is empty */
  isEmpty: boolean;
}

const MAX_POSITIONS_DEFAULT = 5;

/**
 * Lightweight hook for retrieving DeFi positions for the homepage.
 *
 * This hook reads from the DeFiPositionsController state (already populated
 * by the controller's background polling) and formats the data for display.
 *
 * Positions are sorted by market value (descending) and limited to maxPositions.
 *
 * @param maxPositions - Maximum number of positions to return (default: 5)
 * @returns DeFi positions data with loading/error/empty states
 */
export const useDeFiPositionsForHomepage = (
  maxPositions: number = MAX_POSITIONS_DEFAULT,
): UseDeFiPositionsForHomepageResult => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const defiPositionsByEnabledNetworks = useSelector(
    selectDefiPositionsByEnabledNetworks,
  );

  const result = useMemo((): UseDeFiPositionsForHomepageResult => {
    // Loading state - data not yet available
    if (defiPositions === undefined) {
      return {
        positions: [],
        isLoading: true,
        hasError: false,
        isEmpty: false,
      };
    }

    // Error state - data fetch failed
    if (defiPositions === null) {
      return {
        positions: [],
        isLoading: false,
        hasError: true,
        isEmpty: false,
      };
    }

    const chainFilteredDeFiPositions = defiPositionsByEnabledNetworks as {
      [key: Hex]: GroupedDeFiPositions;
    };

    if (!chainFilteredDeFiPositions) {
      return {
        positions: [],
        isLoading: false,
        hasError: false,
        isEmpty: true,
      };
    }

    // Flatten positions from all chains and protocols
    const defiPositionsList: DeFiPositionEntry[] = Object.entries(
      chainFilteredDeFiPositions,
    )
      .map(([chainId, chainDeFiPositions]) =>
        Object.entries(chainDeFiPositions.protocols).map(
          ([protocolId, protocolAggregate]) => ({
            chainId: toHex(chainId),
            protocolId,
            protocolAggregate,
          }),
        ),
      )
      .flat();

    // Sort by market value (descending) or name
    const defiSortConfig = {
      ...tokenSortConfig,
      key:
        tokenSortConfig.key === 'tokenFiatAmount'
          ? 'protocolAggregate.aggregatedMarketValue'
          : 'protocolAggregate.protocolDetails.name',
    };

    const sortedPositions = sortAssets(
      defiPositionsList,
      defiSortConfig,
    ) as DeFiPositionEntry[];

    // Limit to maxPositions
    const limitedPositions = sortedPositions.slice(0, maxPositions);

    return {
      positions: limitedPositions,
      isLoading: false,
      hasError: false,
      isEmpty: limitedPositions.length === 0,
    };
  }, [
    defiPositions,
    defiPositionsByEnabledNetworks,
    tokenSortConfig,
    maxPositions,
  ]);

  return result;
};

export default useDeFiPositionsForHomepage;
