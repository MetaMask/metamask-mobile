import React, { memo, useCallback, useState } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictOutcomeGroup,
  PredictPosition,
} from '../../types';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import PredictPicks from '../PredictPicks/PredictPicks';
import PredictOutcomeGroupChips from '../PredictOutcomeGroupChips';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

const MOCK_OUTCOME_GROUPS: PredictOutcomeGroup[] = [
  { key: 'game_lines', outcomes: [] },
  { key: 'assists', outcomes: [] },
  { key: 'points', outcomes: [] },
  { key: 'rebounds', outcomes: [] },
  { key: 'goals', outcomes: [] },
];

interface PredictGameDetailsTabsContentProps {
  market: PredictMarket;
  activeTab: number;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  enabled: boolean;
  showTabBar: boolean;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
}

const OutcomesContent = memo(
  ({
    groups,
    selectedGroupKey,
    onGroupSelect,
  }: {
    groups: PredictOutcomeGroup[];
    selectedGroupKey: string;
    onGroupSelect: (key: string) => void;
  }) => (
    <Box testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_CONTENT}>
      <PredictOutcomeGroupChips
        groups={groups}
        selectedGroupKey={selectedGroupKey}
        onGroupSelect={onGroupSelect}
      />
    </Box>
  ),
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
    const [selectedGroupKey, setSelectedGroupKey] = useState(
      MOCK_OUTCOME_GROUPS[0]?.key ?? '',
    );

    const handleGroupSelect = useCallback((key: string) => {
      setSelectedGroupKey(key);
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
          groups={MOCK_OUTCOME_GROUPS}
          selectedGroupKey={selectedGroupKey}
          onGroupSelect={handleGroupSelect}
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
            groups={MOCK_OUTCOME_GROUPS}
            selectedGroupKey={selectedGroupKey}
            onGroupSelect={handleGroupSelect}
          />
        )}
      </>
    );
  },
);

PredictGameDetailsTabsContent.displayName = 'PredictGameDetailsTabsContent';

export default PredictGameDetailsTabsContent;
