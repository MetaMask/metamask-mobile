import React from 'react';
import { Animated } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictMarketSportCard from './PredictMarketSportCard';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictEntryPoint } from '../../types/navigation';

interface PredictMarketSportCardWrapperProps {
  marketId: string;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCurrentCard: boolean;
  currentCardOpacity: Animated.Value;
  currentCardScale: Animated.Value;
  currentCardTranslateY: Animated.Value;
  nextCardOpacity: Animated.Value;
  nextCardScale: Animated.Value;
  nextCardTranslateY: Animated.Value;
  width: number;
}

const PredictMarketSportCardWrapper: React.FC<
  PredictMarketSportCardWrapperProps
> = ({
  marketId,
  testID,
  entryPoint,
  isCurrentCard,
  currentCardOpacity,
  currentCardScale,
  currentCardTranslateY,
  nextCardOpacity,
  nextCardScale,
  nextCardTranslateY,
  width,
}) => {
  const tw = useTailwind();
  const { market, isFetching, error } = usePredictMarket({
    id: marketId,
    enabled: Boolean(marketId),
  });

  if (isFetching || error || !market) {
    return null;
  }

  return (
    <Animated.View
      style={tw.style('absolute', {
        opacity: isCurrentCard ? currentCardOpacity : nextCardOpacity,
        transform: [
          { scale: isCurrentCard ? currentCardScale : nextCardScale },
          {
            translateY: isCurrentCard
              ? currentCardTranslateY
              : nextCardTranslateY,
          },
        ],
        zIndex: isCurrentCard ? 10 : 5,
        width,
      })}
    >
      <PredictMarketSportCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
      />
    </Animated.View>
  );
};

export default PredictMarketSportCardWrapper;
