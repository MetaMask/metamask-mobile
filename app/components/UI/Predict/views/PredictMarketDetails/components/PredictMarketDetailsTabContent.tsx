import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { PredictMarketDetailsSelectorsIDs } from '../../../Predict.testIds';
import type {
  PredictMarket,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
  PredictPosition,
} from '../../../types';
import PredictMarketDetailsAbout from './PredictMarketDetailsAbout';
import PredictMarketDetailsPositions from './PredictMarketDetailsPositions';
import PredictMarketDetailsOutcomes from './PredictMarketDetailsOutcomes';

type TabKey = 'positions' | 'outcomes' | 'about';

interface PredictMarketDetailsTabContentProps {
  activeTab: number | null;
  tabsReady: boolean;
  tabs: { label: string; key: TabKey }[];
  market: PredictMarket | null;
  activePositions: PredictPosition[];
  claimablePositions: PredictPosition[];
  onPolymarketResolution: () => void;
  singleOutcomeMarket: boolean;
  multipleOutcomes: boolean;
  multipleOpenOutcomesPartiallyResolved: boolean;
  winningOutcome: PredictOutcome | undefined;
  losingOutcome: PredictOutcome | undefined;
  winningOutcomeToken: PredictOutcomeToken | undefined;
  losingOutcomeToken: PredictOutcomeToken | undefined;
  openOutcomes: PredictOutcome[];
  closedOutcomes: PredictOutcome[];
  entryPoint?: string;
}

const PredictMarketDetailsTabContent: React.FC<
  PredictMarketDetailsTabContentProps
> = ({
  activeTab,
  tabsReady,
  tabs,
  market,
  activePositions,
  claimablePositions,
  onPolymarketResolution,
  singleOutcomeMarket,
  multipleOutcomes,
  multipleOpenOutcomesPartiallyResolved,
  winningOutcome,
  losingOutcome,
  winningOutcomeToken,
  losingOutcomeToken,
  openOutcomes,
  closedOutcomes,
  entryPoint,
}) => {
  if (activeTab === null || !tabsReady) {
    return null;
  }
  const currentKey = tabs[activeTab]?.key;
  if (currentKey === 'about') {
    return (
      <Box
        twClassName="px-3 pt-4 pb-8"
        testID={PredictMarketDetailsSelectorsIDs.ABOUT_TAB}
      >
        <PredictMarketDetailsAbout
          market={market}
          onPolymarketResolution={onPolymarketResolution}
        />
      </Box>
    );
  }
  if (currentKey === 'positions') {
    return (
      <Box
        twClassName="px-3 pt-4 pb-8"
        testID={PredictMarketDetailsSelectorsIDs.POSITIONS_TAB}
      >
        <PredictMarketDetailsPositions
          activePositions={activePositions}
          claimablePositions={claimablePositions}
          market={market}
        />
      </Box>
    );
  }
  if (currentKey === 'outcomes') {
    return (
      <Box
        twClassName="px-3 pt-4 pb-8"
        testID={PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB}
      >
        <PredictMarketDetailsOutcomes
          market={market}
          marketStatus={market?.status as PredictMarketStatus | undefined}
          singleOutcomeMarket={singleOutcomeMarket}
          multipleOutcomes={multipleOutcomes}
          multipleOpenOutcomesPartiallyResolved={
            multipleOpenOutcomesPartiallyResolved
          }
          winningOutcome={winningOutcome}
          losingOutcome={losingOutcome}
          winningOutcomeToken={winningOutcomeToken}
          losingOutcomeToken={losingOutcomeToken}
          openOutcomes={openOutcomes}
          closedOutcomes={closedOutcomes}
          entryPoint={entryPoint}
        />
      </Box>
    );
  }
  return null;
};

export default PredictMarketDetailsTabContent;
