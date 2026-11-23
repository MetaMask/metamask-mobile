import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../types';
import {
  formatAskPrice,
  formatThresholdTitle,
  getAskPricePercent,
} from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { MarketGroupCardTestIds } from './MarketGroupCard.testIds';
import { MarketCard } from './internal/MarketCard';
import { MarketGroupOptionSelector } from './internal/MarketGroupOptionSelector';

export interface ThresholdMarketGroupCardProps {
  groupKey: string;
  markets: readonly PredictMarket[];
  selectedMarket: PredictMarket;
  onSelectMarket: (marketId: PredictMarket['id']) => void;
  onRulesPress?: (market: PredictMarket) => void;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
}

const findOutcome = (
  market: PredictMarket,
  side: PredictOutcome['side'],
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

// A line's Yes Outcome is just "Yes", so the row names the label and line:
// "Josh Jacobs, 60 or more, Yes 42¢".
const getOptionAccessibilityLabel = (market: PredictMarket): string => {
  const label = market.group?.label?.trim();
  const values = {
    label,
    value:
      market.group?.option?.value ??
      strings('predict.market_groups.line_unavailable'),
    outcome: strings('predict_next.portfolio.outcome_side.yes'),
    price:
      formatAskPrice(findOutcome(market, 'yes')?.askPrice) ??
      strings('predict.market_groups.price_unavailable'),
  };
  return label
    ? strings(
        'predict.market_groups.threshold_option_accessibility_label',
        values,
      )
    : strings(
        'predict.market_groups.threshold_option_unlabelled_accessibility_label',
        values,
      );
};

/**
 * An "at least N" ladder as one card: the group label with the selected line
 * ("Josh Jacobs: 60+"), the line's chance, Yes and No, and a picker of its
 * lines. It knows nothing about the sport or stat the lines count.
 */
export const ThresholdMarketGroupCard = React.memo(
  ({
    groupKey,
    markets,
    selectedMarket,
    onSelectMarket,
    onRulesPress,
    onOrder,
  }: ThresholdMarketGroupCardProps): React.JSX.Element | null => {
    const yesOutcome = findOutcome(selectedMarket, 'yes');
    const noOutcome = findOutcome(selectedMarket, 'no');

    if (!yesOutcome || !noOutcome) {
      return null;
    }

    const title =
      formatThresholdTitle(selectedMarket) ??
      strings('predict.market_groups.line_unavailable');
    const rules = selectedMarket.rules?.trim();
    const yesPercent = getAskPricePercent(yesOutcome.askPrice);

    return (
      <MarketCard.Root testID={MarketGroupCardTestIds.card(groupKey)}>
        <MarketCard.Header>
          <MarketCard.Summary>
            <MarketCard.Title
              testID={MarketGroupCardTestIds.title(groupKey)}
              onPress={
                rules && onRulesPress
                  ? () => onRulesPress(selectedMarket)
                  : undefined
              }
              accessibilityHint={strings(
                'predict.rules.market_accessibility_label',
              )}
            >
              {title}
            </MarketCard.Title>
          </MarketCard.Summary>
          {yesPercent !== undefined ? (
            <MarketCard.Percentage
              value={yesPercent}
              testID={MarketGroupCardTestIds.percentage(groupKey)}
            />
          ) : null}
        </MarketCard.Header>

        <MarketCard.Actions>
          <MarketCard.OutcomeButton
            label={strings('predict_next.portfolio.outcome_side.yes')}
            price={formatAskPrice(yesOutcome.askPrice)}
            side="yes"
            testID={MarketGroupCardTestIds.outcomeButton(
              groupKey,
              selectedMarket.id,
              'yes',
            )}
            onPress={() => onOrder?.(selectedMarket, yesOutcome)}
            isDisabled={!isOutcomeTradeable(selectedMarket, yesOutcome)}
          />
          <MarketCard.OutcomeButton
            label={strings('predict_next.portfolio.outcome_side.no')}
            price={formatAskPrice(noOutcome.askPrice)}
            side="no"
            testID={MarketGroupCardTestIds.outcomeButton(
              groupKey,
              selectedMarket.id,
              'no',
            )}
            onPress={() => onOrder?.(selectedMarket, noOutcome)}
            isDisabled={!isOutcomeTradeable(selectedMarket, noOutcome)}
          />
        </MarketCard.Actions>

        {markets.length > 1 ? (
          <MarketCard.Footer>
            <MarketGroupOptionSelector
              groupKey={groupKey}
              markets={markets}
              selectedMarketId={selectedMarket.id}
              onSelect={onSelectMarket}
              getOptionAccessibilityLabel={getOptionAccessibilityLabel}
            />
          </MarketCard.Footer>
        ) : null}
      </MarketCard.Root>
    );
  },
);

ThresholdMarketGroupCard.displayName = 'ThresholdMarketGroupCard';
