import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import { selectDefiPositionsByChainIds } from '../../../../../../selectors/defiPositionsController';
import { useNetworkEnablement } from '../../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { RootState } from '../../../../../../reducers';
import { sortAssets } from '../../../../../UI/Tokens/util';
import { selectHomepageSectionsV1Enabled } from '../../../../../../selectors/featureFlagController/homepage';
import { selectEVMEnabledNetworks } from '../../../../../../selectors/networkEnablementController';

/** Homepage always sorts DeFi by market value; View all uses user preference. */
const HOMEPAGE_DEFI_SORT_BY_VALUE = {
  key: 'protocolAggregate.aggregatedMarketValue',
  order: 'dsc',
  sortCallback: 'stringNumeric',
} as const;

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
  const evmEnabledNetworks = useSelector(selectEVMEnabledNetworks);
  const isHomepageSectionsV1Enabled = useSelector(
    selectHomepageSectionsV1Enabled,
  );
  const { popularEvmNetworks } = useNetworkEnablement();

  const popularEvmChainIds = useMemo(
    () =>
      isHomepageSectionsV1Enabled ? popularEvmNetworks : evmEnabledNetworks,
    [isHomepageSectionsV1Enabled, popularEvmNetworks, evmEnabledNetworks],
  );

  const defiPositionsByChainIds = useSelector((state: RootState) =>
    selectDefiPositionsByChainIds(state, popularEvmChainIds),
  );

  const result = useMemo((): UseDeFiPositionsForHomepageResult => {
    // Loading state - data not yet available
    if (defiPositionsByChainIds === undefined) {
      return {
        positions: [],
        isLoading: true,
        hasError: false,
        isEmpty: false,
      };
    }

    // Error state - data fetch failed
    if (defiPositionsByChainIds === null) {
      return {
        positions: [],
        isLoading: false,
        hasError: true,
        isEmpty: false,
      };
    }

    const chainFilteredDeFiPositions = defiPositionsByChainIds as {
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

    // Homepage always sorts by market value (descending); View all DeFi list uses user preference.
    const sortedPositions = sortAssets(
      defiPositionsList,
      HOMEPAGE_DEFI_SORT_BY_VALUE,
    ) as DeFiPositionEntry[];

    // Limit to maxPositions
    const limitedPositions = sortedPositions.slice(0, maxPositions);

    return {
      positions: limitedPositions,
      isLoading: false,
      hasError: false,
      isEmpty: limitedPositions.length === 0,
    };
  }, [defiPositionsByChainIds, maxPositions]);

  return result;
};

export default useDeFiPositionsForHomepage;
