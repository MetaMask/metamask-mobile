import React, { memo, useCallback, useEffect } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeGroup,
  PredictOutcomeToken,
  PredictPosition,
  PriceQuery,
  PriceUpdate,
} from '../../types';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
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
  activeChipKey: string;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  onVisiblePriceQueriesChange: (queries: PriceQuery[]) => void;
  onBetPress: (token: PredictOutcomeToken) => void;
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
    activeChipKey,
    getPrice,
    onVisiblePriceQueriesChange,
    onBetPress,
  }: PredictGameDetailsTabsContentProps) => {
    const handleBuyPress = useCallback(
      (_outcome: PredictOutcome, token: PredictOutcomeToken) => {
        onBetPress(token);
      },
      [onBetPress],
    );

    const hasPositions =
      activePositions.length > 0 || claimablePositions.length > 0;
    const currentKey = showTabBar ? tabs[activeTab]?.key : 'outcomes';

    useEffect(() => {
      if (!enabled || currentKey !== 'outcomes') {
        onVisiblePriceQueriesChange([]);
      }
    }, [currentKey, enabled, onVisiblePriceQueriesChange]);

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
        <PredictGameOutcomesTab
          groupMap={groupMap}
          game={market.game}
          activeChipKey={activeChipKey}
          getPrice={getPrice}
          onVisiblePriceQueriesChange={onVisiblePriceQueriesChange}
          onBuyPress={handleBuyPress}
        />
      );
    }

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
            game={market.game}
            activeChipKey={activeChipKey}
            getPrice={getPrice}
            onVisiblePriceQueriesChange={onVisiblePriceQueriesChange}
            onBuyPress={handleBuyPress}
          />
        )}
      </>
    );
  },
);

PredictGameDetailsTabsContent.displayName = 'PredictGameDetailsTabsContent';

export default PredictGameDetailsTabsContent;
