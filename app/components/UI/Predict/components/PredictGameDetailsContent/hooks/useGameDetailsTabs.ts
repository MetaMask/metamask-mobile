import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectExtendedSportsMarketsLeagues } from '../../../selectors/featureFlags';
import type { PredictPosition, PredictSportsLeague } from '../../../types';
import type { PredictMarketDetailsTabKey } from '../../../Predict.testIds';

interface UseGameDetailsTabsParams {
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  league: PredictSportsLeague | undefined;
}

export function useGameDetailsTabs({
  activePositions,
  claimablePositions,
  league,
}: UseGameDetailsTabsParams) {
  const extendedLeagues = useSelector(selectExtendedSportsMarketsLeagues);
  const enabled = league ? extendedLeagues.includes(league) : false;

  const [activeTab, setActiveTab] = useState<number | null>(null);

  const hasPositions =
    activePositions.length > 0 || claimablePositions.length > 0;

  const tabs = useMemo(() => {
    const result: { label: string; key: PredictMarketDetailsTabKey }[] = [];
    if (hasPositions) {
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
  }, [hasPositions]);

  useEffect(() => {
    if (!enabled) return;
    if (activeTab === null) {
      setActiveTab(0);
      return;
    }
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs, activeTab, enabled]);

  const handleTabPress = useCallback((tabIndex: number) => {
    setActiveTab(tabIndex);
  }, []);

  const showTabBar = enabled && hasPositions;

  const stickyHeaderIndices = useMemo(
    () => (showTabBar ? [2] : undefined),
    [showTabBar],
  );

  return {
    enabled,
    showTabBar,
    tabs,
    activeTab,
    handleTabPress,
    stickyHeaderIndices,
  };
}
