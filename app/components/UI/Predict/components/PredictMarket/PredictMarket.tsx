import React from 'react';
import { useSelector } from 'react-redux';
import { PredictMarket as PredictMarketType } from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictEntryPoint } from '../../contexts';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import PredictMarketSingle from '../PredictMarketSingle';
import PredictMarketMultiple from '../PredictMarketMultiple';
import PredictMarketSportCard from '../PredictMarketSportCard';
import PredictCryptoUpDownMarketCard from '../PredictCryptoUpDownMarketCard';
import { isCryptoUpDown } from '../../utils/cryptoUpDown';
import { selectPredictUpDownEnabledFlag } from '../../selectors/featureFlags';

interface PredictMarketProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  isCarousel?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: (marketId: string) => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  entryPoint: propEntryPoint,
  isCarousel = false,
  onCardPress,
  onBuyButtonPress,
  transactionActiveAbTests,
}) => {
  const contextEntryPoint = usePredictEntryPoint();
  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);
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
        transactionActiveAbTests={transactionActiveAbTests}
      />
    );
  }

  if (upDownEnabled && isCryptoUpDown(market)) {
    return (
      <PredictCryptoUpDownMarketCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
        transactionActiveAbTests={transactionActiveAbTests}
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
        transactionActiveAbTests={transactionActiveAbTests}
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
      transactionActiveAbTests={transactionActiveAbTests}
    />
  );
};

export default PredictMarket;
