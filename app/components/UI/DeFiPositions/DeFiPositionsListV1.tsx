import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { toHex } from '@metamask/controller-utils';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from '../../../selectors/defiPositionsController';
import {
  selectPrivacyMode,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { sortAssets } from '../Tokens/util';
import DeFiPositionsListItem from './DeFiPositionsListItem';
import Engine from '../../../core/Engine';
import DeFiPositionsListView, {
  DeFiPositionsListState,
} from './DeFiPositionsListView';

interface DeFiPositionsListV1Props {
  isFullView: boolean;
}

/**
 * DeFiPositionsListV1 - full view / list backed by the legacy polling
 * controller. Reads positions from Redux (tri-state: `undefined` = loading,
 * `null` = error, object = loaded) and maps them onto the shared list view.
 */
const DeFiPositionsListV1: React.FC<DeFiPositionsListV1Props> = ({
  isFullView,
}) => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const defiPositionsByEnabledNetworks = useSelector(
    selectDefiPositionsByEnabledNetworks,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const [refreshing, setRefreshing] = useState(false);

  const formattedDeFiPositions = useMemo(() => {
    if (!defiPositions) {
      // Preserve tri-state: undefined (loading) or null (error).
      return defiPositions;
    }

    const chainFilteredDeFiPositions = defiPositionsByEnabledNetworks as {
      [key: Hex]: GroupedDeFiPositions;
    };

    if (!chainFilteredDeFiPositions) {
      return [];
    }

    const defiPositionsList = Object.entries(chainFilteredDeFiPositions)
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

    const defiSortConfig = {
      ...tokenSortConfig,
      key:
        tokenSortConfig.key === 'tokenFiatAmount'
          ? 'protocolAggregate.aggregatedMarketValue'
          : 'protocolAggregate.protocolDetails.name',
    };

    return sortAssets(defiPositionsList, defiSortConfig);
  }, [defiPositions, tokenSortConfig, defiPositionsByEnabledNetworks]);

  const handleDeFiRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Engine.context.DeFiPositionsController._executePoll();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const state = useMemo((): DeFiPositionsListState => {
    if (formattedDeFiPositions === undefined) {
      return { status: 'loading' };
    }
    if (formattedDeFiPositions === null) {
      return { status: 'error' };
    }

    const positions = formattedDeFiPositions as {
      chainId: Hex;
      protocolId: string;
      protocolAggregate: GroupedDeFiPositions['protocols'][number];
    }[];

    return {
      status: 'ready',
      listLength: positions.length,
      items: positions.map(({ chainId, protocolId, protocolAggregate }) => (
        <DeFiPositionsListItem
          key={`${chainId}-${protocolAggregate.protocolDetails.name}`}
          chainId={chainId}
          protocolId={protocolId}
          protocolAggregate={protocolAggregate}
          privacyMode={privacyMode}
        />
      )),
    };
  }, [formattedDeFiPositions, privacyMode]);

  return (
    <DeFiPositionsListView
      state={state}
      isFullView={isFullView}
      refreshing={refreshing}
      onRefresh={handleDeFiRefresh}
    />
  );
};

export default DeFiPositionsListV1;
