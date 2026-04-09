import React, { memo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket, PredictPosition } from '../../types';
import type { PredictMarketDetailsTabKey } from '../../Predict.testIds';
import PredictPicks from '../PredictPicks/PredictPicks';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from './PredictGameDetailsContent.testIds';

interface PredictGameDetailsTabsProps {
  market: PredictMarket;
  activeTab: number | null;
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  enabled: boolean;
  showTabBar: boolean;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
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
  }: PredictGameDetailsTabsProps) => {
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
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="px-4 py-12"
          testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('predict.market_details.outcomes_coming_soon')}
          </Text>
        </Box>
      );
    }

    const currentKey = activeTab !== null ? tabs[activeTab]?.key : undefined;

    return (
      <>
        {currentKey === 'positions' && (
          <Box
            twClassName="px-4 py-2"
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
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="px-4 py-12"
            testID={PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.OUTCOMES_PLACEHOLDER}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('predict.market_details.outcomes_coming_soon')}
            </Text>
          </Box>
        )}
      </>
    );
  },
);

PredictGameDetailsTabsContent.displayName = 'PredictGameDetailsTabsContent';

export default PredictGameDetailsTabsContent;
