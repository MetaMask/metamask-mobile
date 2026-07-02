import React, { memo, useCallback } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictPosition,
} from '../../types';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import { usePredictGame } from '../../hooks/usePredictGame';
import PredictPicks from '../PredictPicks/PredictPicks';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';
import PredictGameOutcomesTab from './PredictGameOutcomesTab';

interface PredictGameDetailsTabsContentProps {
  market: PredictMarket;
  activeTab: number;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  enabled: boolean;
  showTabBar: boolean;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  groupMap: Map<string, PredictOutcomeGroup>;
  resolvedOutcomeGroups?: PredictOutcomeGroup[];
  activeChipKey: string;
  onBetPress: (token: PredictOutcomeToken) => void;
  nonRegTimeSportsMarketTypes?: string[];
  onRegTimeInfoPress?: () => void;
}

const PredictGameDetailsTabsContent = memo(
  ({
    market,
    activeTab,
    tabs,
    enabled,
    showTabBar,
    activePositions,
    claimablePositions,
    groupMap,
    resolvedOutcomeGroups = [],
    activeChipKey,
    onBetPress,
    nonRegTimeSportsMarketTypes = [],
    onRegTimeInfoPress,
  }: PredictGameDetailsTabsContentProps) => {
    const { game } = usePredictGame(market, { live: false });
    const handleBuyPress = useCallback(
      (_outcome: PredictOutcome, token: PredictOutcomeToken) => {
        onBetPress(token);
      },
      [onBetPress],
    );

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
      if (hasPositions) {
        return (
          <Box twClassName="px-4 py-2">
            <Text
              variant={TextVariant.HeadingMd}
              twClassName="font-medium pt-8"
            >
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

      return (
        <PredictGameOutcomesTab
          groupMap={groupMap}
          resolvedOutcomeGroups={resolvedOutcomeGroups}
          game={game}
          activeChipKey={activeChipKey}
          onBuyPress={handleBuyPress}
          nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
          onRegTimeInfoPress={onRegTimeInfoPress}
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
          <PredictGameOutcomesTab
            groupMap={groupMap}
            resolvedOutcomeGroups={resolvedOutcomeGroups}
            game={game}
            activeChipKey={activeChipKey}
            onBuyPress={handleBuyPress}
            nonRegTimeSportsMarketTypes={nonRegTimeSportsMarketTypes}
            onRegTimeInfoPress={onRegTimeInfoPress}
          />
        )}
      </>
    );
  },
);

PredictGameDetailsTabsContent.displayName = 'PredictGameDetailsTabsContent';

export default PredictGameDetailsTabsContent;
