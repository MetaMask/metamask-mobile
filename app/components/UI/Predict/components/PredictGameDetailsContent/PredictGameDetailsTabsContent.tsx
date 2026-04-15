import React, { memo, useCallback, useMemo, useState } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictMarketGame,
  PredictOutcomeGroup,
  PredictPosition,
} from '../../types';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import PredictChipList, { type PredictChipItem } from '../PredictChipList';
import PredictPicks from '../PredictPicks/PredictPicks';
import { getOutcomeGroupLabel } from '../../utils/outcomeGroupLabel';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import GroupContent from './GroupContent';

interface PredictGameDetailsTabsContentProps {
  market: PredictMarket;
  activeTab: number;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  enabled: boolean;
  showTabBar: boolean;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
}

const toChips = (groups: PredictOutcomeGroup[]): PredictChipItem[] =>
  groups.map((g) => ({ key: g.key, label: getOutcomeGroupLabel(g.key) }));

const OutcomesContent = memo(
  ({
    outcomeGroups,
    game,
    chips,
    activeChipKey,
    onChipSelect,
  }: {
    outcomeGroups: PredictOutcomeGroup[];
    game?: PredictMarketGame;
    chips: PredictChipItem[];
    activeChipKey: string;
    onChipSelect: (key: string) => void;
  }) => {
    const selectedGroup = useMemo(
      () => outcomeGroups.find((g) => g.key === activeChipKey),
      [outcomeGroups, activeChipKey],
    );

    return (
      <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
        <PredictChipList
          chips={chips}
          activeChipKey={activeChipKey}
          onChipSelect={onChipSelect}
        />
        {selectedGroup && (
          <Box twClassName="px-4 pt-3">
            <GroupContent group={selectedGroup} game={game} />
          </Box>
        )}
      </Box>
    );
  },
);

OutcomesContent.displayName = 'OutcomesContent';

const PredictGameDetailsTabsContent = memo(
  ({
    market,
    activeTab,
    tabs,
    enabled,
    showTabBar,
    activePositions,
    claimablePositions,
  }: PredictGameDetailsTabsContentProps) => {
    const outcomeGroups = useMemo(
      () => market.outcomeGroups ?? [],
      [market.outcomeGroups],
    );

    const [activeChipKey, setActiveChipKey] = useState(
      outcomeGroups[0]?.key ?? '',
    );

    const chips = useMemo(() => toChips(outcomeGroups), [outcomeGroups]);

    const handleChipSelect = useCallback((key: string) => {
      setActiveChipKey(key);
    }, []);

    const hasPositions =
      activePositions.length > 0 || claimablePositions.length > 0;

    if (!enabled) {
      if (!hasPositions) {
        return null;
      }
      return (
        <Box twClassName="px-4 py-2">
          <Text variant={TextVariant.HeadingMd} twClassName="font-medium pt-8">
            {strings('predict.market_details.your_picks')}
          </Text>
          <PredictPicks
            market={market}
            positions={activePositions}
            claimablePositions={claimablePositions}
            testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK}
          />
        </Box>
      );
    }

    if (!showTabBar) {
      return (
        <OutcomesContent
          outcomeGroups={outcomeGroups}
          game={market.game}
          chips={chips}
          activeChipKey={activeChipKey}
          onChipSelect={handleChipSelect}
        />
      );
    }

    const currentKey = tabs[activeTab]?.key;

    return (
      <>
        {currentKey === 'positions' && (
          <Box
            twClassName="px-4"
            testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.TAB_CONTENT}
          >
            <PredictPicks
              market={market}
              positions={activePositions}
              claimablePositions={claimablePositions}
              testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.GAME_PICK}
            />
          </Box>
        )}
        {currentKey === 'outcomes' && (
          <OutcomesContent
            outcomeGroups={outcomeGroups}
            game={market.game}
            chips={chips}
            activeChipKey={activeChipKey}
            onChipSelect={handleChipSelect}
          />
        )}
      </>
    );
  },
);

PredictGameDetailsTabsContent.displayName = 'PredictGameDetailsTabsContent';

export default PredictGameDetailsTabsContent;
