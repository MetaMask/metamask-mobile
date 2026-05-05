import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictEntryPoint } from '../../contexts';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';
import PredictMarketSportCard from '../PredictMarketSportCard';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onBeforePress?: () => void;
  /** Called when the user taps a vote button (before betslip opens). */
  onVote?: (marketId: string) => void;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  isCarousel = false,
  onBeforePress,
  onVote,
}) => {
  const contextEntryPoint = usePredictEntryPoint();
  const entryPoint =
    contextEntryPoint ??
    propEntryPoint ??
    PredictEventValues.ENTRY_POINT.PREDICT_FEED;
  if (market.game) {
    return (
      <PredictMarketSportCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
        onBeforePress={onBeforePress}
        onVote={onVote}
      />
    );
  }

  if (market.outcomes.length === 1) {
    return (
      <PredictMarketSingle
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
        onBeforePress={onBeforePress}
        onVote={onVote}
      />
    );
  }

  return (
    <PredictMarketMultiple
      market={market}
      testID={testID}
      entryPoint={entryPoint}
      isCarousel={isCarousel}
      onBeforePress={onBeforePress}
      onVote={onVote}
    />
  );
};

export default PredictMarket;
