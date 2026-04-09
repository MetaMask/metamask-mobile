import { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { usePredictPositions } from '../../../hooks/usePredictPositions';
import type { PredictMarketDetailsTabKey } from '../../../Predict.testIds';

// TODO: Replace with real feature flag selector from PRED-801 (extendedSportsMarketsLeagues)
const ENABLE_GAME_TABS = true;

interface UseGameDetailsTabsParams {
  marketId: string;
}

export function useGameDetailsTabs({ marketId }: UseGameDetailsTabsParams) {
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const { data: activePositions = [] } = usePredictPositions({
    marketId,
    claimable: false,
    enabled: ENABLE_GAME_TABS,
  });

  const { data: claimablePositions = [] } = usePredictPositions({
    marketId,
    claimable: true,
    enabled: ENABLE_GAME_TABS,
  });

  const tabs = useMemo(() => {
    const result: { label: string; key: PredictMarketDetailsTabKey }[] = [];
    if (activePositions.length > 0 || claimablePositions.length > 0) {
      result.push({
        label: strings('predict.tabs.positions'),
        key: 'positions',
      });
    }
    result.push({
      label: strings('predict.tabs.outcomes'),
      key: 'outcomes',
    });
    return result;
  }, [activePositions.length, claimablePositions.length]);

  useEffect(() => {
    if (!ENABLE_GAME_TABS) return;
    if (activeTab === null) {
      setActiveTab(0);
      return;
    }
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs, activeTab]);

  const handleTabPress = useCallback((tabIndex: number) => {
    setActiveTab(tabIndex);
  }, []);

  const stickyHeaderIndices = useMemo(
    () => (ENABLE_GAME_TABS ? [2] : undefined),
    [],
  );

  return {
    enabled: ENABLE_GAME_TABS,
    tabs,
    activeTab,
    handleTabPress,
    stickyHeaderIndices,
  };
}
