import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectExtendedSportsMarketsLeagues } from '../selectors/featureFlags';
import type {
  PredictOutcomeGroup,
  PredictPosition,
  PredictSportsLeague,
} from '../types';
import type { PredictMarketDetailsTabKey } from '../Predict.testIds';
import type { PredictChipItem } from '../components/PredictChipList';
import { getOutcomeGroupLabel } from '../utils/outcomeGroupLabel';

interface UseGameDetailsTabsParams {
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  league: PredictSportsLeague | undefined;
  outcomeGroups: PredictOutcomeGroup[];
}

const toChips = (groups: PredictOutcomeGroup[]): PredictChipItem[] =>
  groups.map((g) => ({ key: g.key, label: getOutcomeGroupLabel(g.key) }));

export function useGameDetailsTabs({
  activePositions,
  claimablePositions,
  league,
  outcomeGroups,
}: UseGameDetailsTabsParams) {
  const extendedLeagues = useSelector(selectExtendedSportsMarketsLeagues);
  const enabled = league ? extendedLeagues.includes(league) : false;

  const [activeTab, setActiveTab] = useState(0);

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

  const handleTabPress = useCallback((tabIndex: number) => {
    setActiveTab(tabIndex);
  }, []);

  const showTabBar = enabled && hasPositions;

  const chips = useMemo(() => toChips(outcomeGroups), [outcomeGroups]);

  const [activeChipKey, setActiveChipKey] = useState(
    outcomeGroups[0]?.key ?? '',
  );

  useEffect(() => {
    const exists = outcomeGroups.some((g) => g.key === activeChipKey);
    if (!exists) {
      setActiveChipKey(outcomeGroups[0]?.key ?? '');
    }
  }, [outcomeGroups, activeChipKey]);

  const handleChipSelect = useCallback((key: string) => {
    setActiveChipKey(key);
  }, []);

  const isOutcomesVisible =
    enabled && (!showTabBar || tabs[activeTab]?.key === 'outcomes');

  const showChips = isOutcomesVisible && chips.length > 0;

  return {
    enabled,
    showTabBar,
    tabs,
    activeTab,
    handleTabPress,
    chips,
    activeChipKey,
    handleChipSelect,
    showChips,
  };
}
