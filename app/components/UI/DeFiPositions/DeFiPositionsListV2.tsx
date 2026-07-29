import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import {
  selectPrivacyMode,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { getMaybeHexChainId } from '../../../util/bridge';
import DeFiPositionsListItemV2 from '../Assets/DeFiPositions/components/DeFiPositionsListItemV2';
import { useDeFiPositionsV2 } from '../Assets/DeFiPositions/hooks/useDeFiPositionsV2';
import DeFiPositionsListView, {
  DeFiPositionsListState,
} from './DeFiPositionsListView';

interface DeFiPositionsListV2Props {
  isFullView: boolean;
}

/**
 * DeFiPositionsListV2 - full view / list backed by the on-demand V2 controller.
 * Fetches immediately (the full-view surface is the viewport), filters to the
 * enabled EVM networks, sorts per user preference, and maps positions onto the
 * shared list view.
 */
const DeFiPositionsListV2: React.FC<DeFiPositionsListV2Props> = ({
  isFullView,
}) => {
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const privacyMode = useSelector(selectPrivacyMode);
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );
  const [refreshing, setRefreshing] = useState(false);

  const {
    positions,
    isLoading,
    isError,
    refresh: refreshV2,
  } = useDeFiPositionsV2({
    enabled: true,
    // Full view / list surface is the viewport — fetch immediately when mounted.
    isVisible: true,
  });

  const formattedPositions = useMemo(() => {
    const enabledEvmNetworks =
      enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155] ?? {};
    const enabledHexChainIds = new Set(
      Object.keys(enabledEvmNetworks).filter(
        (chainId) => enabledEvmNetworks[chainId as Hex],
      ),
    );

    const filtered = positions.filter((position) => {
      const hexChainId = getMaybeHexChainId(position.chainId);
      if (hexChainId) {
        return enabledHexChainIds.has(hexChainId);
      }
      // Non-EVM (e.g. Solana): include when present in V2 results.
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (tokenSortConfig.key === 'tokenFiatAmount') {
        return tokenSortConfig.order === 'dsc'
          ? b.marketValue - a.marketValue
          : a.marketValue - b.marketValue;
      }
      const nameA = a.protocolId.toLowerCase();
      const nameB = b.protocolId.toLowerCase();
      return tokenSortConfig.order === 'dsc'
        ? nameB.localeCompare(nameA)
        : nameA.localeCompare(nameB);
    });
  }, [positions, enabledNetworksByNamespace, tokenSortConfig]);

  const handleDeFiRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshV2();
    } finally {
      setRefreshing(false);
    }
  }, [refreshV2]);

  const state = useMemo((): DeFiPositionsListState => {
    if (isLoading) {
      return { status: 'loading' };
    }
    if (isError) {
      return { status: 'error' };
    }
    return {
      status: 'ready',
      listLength: formattedPositions.length,
      items: formattedPositions.map((position) => (
        <DeFiPositionsListItemV2
          key={`${position.chainId}-${position.protocolId}`}
          position={position}
          privacyMode={privacyMode}
        />
      )),
    };
  }, [isLoading, isError, formattedPositions, privacyMode]);

  return (
    <DeFiPositionsListView
      state={state}
      isFullView={isFullView}
      refreshing={refreshing}
      onRefresh={handleDeFiRefresh}
    />
  );
};

export default DeFiPositionsListV2;
