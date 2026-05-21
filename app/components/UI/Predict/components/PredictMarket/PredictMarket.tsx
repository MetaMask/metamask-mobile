import React from 'react';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictEntryPoint } from '../../contexts';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';
import PredictMarketSportCard from '../PredictMarketSportCard';
import PredictCryptoUpDownMarketCard from '../PredictCryptoUpDownMarketCard';
import { isCryptoUpDown } from '../../utils/cryptoUpDown';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: (marketId: string) => void;
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  isCarousel = false,
  onCardPress,
  onBuyButtonPress,
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
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
      />
    );
  }

  if (isCryptoUpDown(market)) {
    return (
      <PredictCryptoUpDownMarketCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
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
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
      />
    );
  }

  return (
    <PredictMarketMultiple
      market={market}
      testID={testID}
      entryPoint={entryPoint}
      isCarousel={isCarousel}
      onCardPress={onCardPress}
      onBuyButtonPress={onBuyButtonPress}
    />
  );
};

export default PredictMarket;
