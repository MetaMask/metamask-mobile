import React from 'react';
import type { PredictMarket, PredictOutcome } from '../../types';
import {
  formatAskPrice,
  formatVolume,
  getAskPricePercent,
} from '../shared/formatting';
import { MarketStandardCardTestIds } from './MarketStandardCard.testIds';
import { MarketCard } from './internal/MarketCard';

export interface MarketStandardCardProps {
  market: PredictMarket;
}

const findOutcome = (
  market: PredictMarket,
  side: 'yes' | 'no',
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

export const MarketStandardCard = ({ market }: MarketStandardCardProps) => {
  const yesOutcome = findOutcome(market, 'yes');
  const noOutcome = findOutcome(market, 'no');

  if (!yesOutcome || !noOutcome) {
    return null;
  }

  const volume = formatVolume(market.volume);
  const yesPercent = getAskPricePercent(yesOutcome.askPrice);
  const yesPrice = formatAskPrice(yesOutcome.askPrice);
  const noPrice = formatAskPrice(noOutcome.askPrice);

  return (
    <MarketCard.Root testID={MarketStandardCardTestIds.card(market.id)}>
      <MarketCard.Header>
        <MarketCard.Summary>
          <MarketCard.Title testID={MarketStandardCardTestIds.title(market.id)}>
            {yesOutcome.label}
          </MarketCard.Title>
          {volume ? (
            <MarketCard.Volume
              value={volume}
              testID={MarketStandardCardTestIds.volume(market.id)}
            />
          ) : null}
        </MarketCard.Summary>
        {yesPercent !== undefined ? (
          <MarketCard.Percentage
            value={yesPercent}
            testID={MarketStandardCardTestIds.percentage(market.id)}
          />
        ) : null}
      </MarketCard.Header>

      {yesPercent !== undefined ? (
        <MarketCard.SplitBar
          yesPercent={yesPercent}
          testID={MarketStandardCardTestIds.bar(market.id)}
          yesTestID={MarketStandardCardTestIds.barYes(market.id)}
          noTestID={MarketStandardCardTestIds.barNo(market.id)}
        />
      ) : null}

      <MarketCard.Actions>
        <MarketCard.OutcomeButton
          label="Yes"
          price={yesPrice}
          side="yes"
          testID={MarketStandardCardTestIds.yesButton(market.id)}
        />
        <MarketCard.OutcomeButton
          label="No"
          price={noPrice}
          side="no"
          testID={MarketStandardCardTestIds.noButton(market.id)}
        />
      </MarketCard.Actions>
    </MarketCard.Root>
  );
};
