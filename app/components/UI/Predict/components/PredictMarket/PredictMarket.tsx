import React from 'react';
import { useSelector } from 'react-redux';
import {
  PredictMarket as PredictMarketType,
  type PredictMarketBuyButtonPress,
} from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { useResolvedPredictEntryPoint } from '../../hooks/useResolvedPredictEntryPoint';
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
  cardPressDisabled?: boolean;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
  /** Called when the user taps a buy button (before betslip opens). */
  onBuyButtonPress?: PredictMarketBuyButtonPress;
  /** Active feed tab key forwarded to trade analytics (e.g. "trending", "world-cup"). */
  predictFeedTab?: string;
  /** Screen context forwarded to trade analytics (e.g. "world_cup"). */
  predictScreen?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictMarket: React.FC<PredictMarketProps> = ({
  market,
  testID,
  cardPressDisabled,
  entryPoint: propEntryPoint,
  isCarousel = false,
  onCardPress,
  onBuyButtonPress,
  predictFeedTab,
  predictScreen,
  transactionActiveAbTests,
}) => {
  const entryPoint = useResolvedPredictEntryPoint(propEntryPoint);
  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);

  if (market.game) {
    return (
      <PredictMarketSportCard
        market={market}
        testID={testID}
        entryPoint={entryPoint}
        isCarousel={isCarousel}
        cardPressDisabled={cardPressDisabled}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
        predictFeedTab={predictFeedTab}
        predictScreen={predictScreen}
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
        cardPressDisabled={cardPressDisabled}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
        predictFeedTab={predictFeedTab}
        predictScreen={predictScreen}
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
        cardPressDisabled={cardPressDisabled}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
        predictFeedTab={predictFeedTab}
        predictScreen={predictScreen}
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
      cardPressDisabled={cardPressDisabled}
      onCardPress={onCardPress}
      onBuyButtonPress={onBuyButtonPress}
      predictFeedTab={predictFeedTab}
      predictScreen={predictScreen}
      transactionActiveAbTests={transactionActiveAbTests}
    />
  );
};

export default PredictMarket;
