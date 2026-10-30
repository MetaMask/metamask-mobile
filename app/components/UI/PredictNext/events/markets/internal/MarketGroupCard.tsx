import React from 'react';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictMarket, PredictOutcome } from '../../../types';
import {
  formatAskPrice,
  formatMarketGroupOption,
  getAskPricePercent,
} from '../../shared/formatting';
import { MarketGroupOptionSelector } from './MarketGroupOptionSelector';
import { MarketGroupCardTestIds } from '../MarketGroupCard.testIds';
import { MarketCard } from './MarketCard';
import { isOutcomeTradeable } from '../../shared/tradeable';
import { OutcomeRow as SharedOutcomeRow } from '../../shared/ui';

/** How one Outcome row of a line picker looks: its color and trailing value. */
export interface MarketGroupOutcomeAppearance {
  color: string;
  value: string;
}

export interface MarketGroupCardProps {
  groupKey: string;
  title: string;
  markets: readonly PredictMarket[];
  selectedMarket: PredictMarket;
  onSelectMarket: (marketId: PredictMarket['id']) => void;
  onRulesPress: (market: PredictMarket) => void;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
  /** Supplied by the spread or total composition. */
  describeOutcome: (
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => MarketGroupOutcomeAppearance;
}

function findOutcome(
  market: PredictMarket,
  side: PredictOutcome['side'],
): PredictOutcome | undefined {
  return market.outcomes.find((outcome) => outcome.side === side);
}

function getOutcomeOptionValue(
  market: PredictMarket,
  outcome: PredictOutcome,
): string {
  return formatMarketGroupOption(market, outcome.side) ?? '—';
}

// Keeps a near-zero chance visible as a short line.
const MIN_LINE_PERCENT = 9.5;

function OutcomeRow({
  groupKey,
  market,
  outcome,
  onOrder,
  appearance: { color, value },
}: {
  groupKey: string;
  market: PredictMarket;
  outcome: PredictOutcome;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
  appearance: MarketGroupOutcomeAppearance;
}): React.JSX.Element {
  const price = formatAskPrice(outcome.askPrice);
  const optionValue = getOutcomeOptionValue(market, outcome);
  const askPricePercent = getAskPricePercent(outcome.askPrice);

  return (
    <SharedOutcomeRow.Root
      testID={MarketGroupCardTestIds.row(groupKey, market.id, outcome.side)}
    >
      <SharedOutcomeRow.Label
        label={outcome.label}
        percent={
          askPricePercent === undefined
            ? undefined
            : Math.max(MIN_LINE_PERCENT, askPricePercent)
        }
        color={color}
        lineTestID={MarketGroupCardTestIds.quoteBar(
          groupKey,
          market.id,
          outcome.side,
        )}
      />
      <SharedOutcomeRow.Value>{value}</SharedOutcomeRow.Value>
      <SharedOutcomeRow.Price
        price={price}
        color={color}
        isDisabled={!isOutcomeTradeable(market, outcome)}
        onPress={() => onOrder?.(market, outcome)}
        accessibilityLabel={strings(
          'predict.market_groups.outcome_accessibility_label',
          {
            team: outcome.label,
            line: optionValue,
            price: price ?? strings('predict.market_groups.price_unavailable'),
          },
        )}
        testID={MarketGroupCardTestIds.outcomeButton(
          groupKey,
          market.id,
          outcome.side,
        )}
      />
    </SharedOutcomeRow.Root>
  );
}

export function MarketGroupCard({
  groupKey,
  title,
  markets,
  selectedMarket,
  onSelectMarket,
  onRulesPress,
  onOrder,
  describeOutcome,
}: MarketGroupCardProps): React.JSX.Element | null {
  const rules = selectedMarket.rules?.trim();
  const yesOutcome = findOutcome(selectedMarket, 'yes');
  const noOutcome = findOutcome(selectedMarket, 'no');

  if (!yesOutcome || !noOutcome) {
    return null;
  }

  return (
    <MarketCard.Root testID={MarketGroupCardTestIds.card(groupKey)}>
      <Box twClassName="flex-row items-center gap-2">
        <Box twClassName="min-w-0 flex-1">
          <MarketCard.Title testID={MarketGroupCardTestIds.title(groupKey)}>
            {title}
          </MarketCard.Title>
        </Box>
        {rules ? (
          <ButtonIcon
            iconName={IconName.Question}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            onPress={() => onRulesPress(selectedMarket)}
            testID={MarketGroupCardTestIds.rulesButton(groupKey)}
            accessibilityLabel={strings(
              'predict.rules.market_accessibility_label',
            )}
            accessibilityRole="button"
          />
        ) : null}
      </Box>
      <Box twClassName="gap-3">
        <OutcomeRow
          groupKey={groupKey}
          market={selectedMarket}
          outcome={yesOutcome}
          onOrder={onOrder}
          appearance={describeOutcome(selectedMarket, yesOutcome)}
        />
        <OutcomeRow
          groupKey={groupKey}
          market={selectedMarket}
          outcome={noOutcome}
          onOrder={onOrder}
          appearance={describeOutcome(selectedMarket, noOutcome)}
        />
      </Box>
      {markets.length > 1 ? (
        <MarketCard.Footer>
          <MarketGroupOptionSelector
            groupKey={groupKey}
            markets={markets}
            selectedMarketId={selectedMarket.id}
            onSelect={onSelectMarket}
          />
        </MarketCard.Footer>
      ) : null}
    </MarketCard.Root>
  );
}
