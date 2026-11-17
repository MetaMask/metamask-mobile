import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice, getAskPricePercent } from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { OutcomeRow } from '../shared/ui';
import { MarketStandardCardTestIds } from './MarketStandardCard.testIds';
import { MarketCard } from './internal/MarketCard';

export interface MarketStandardCardProps {
  market: PredictMarket;
  onRulesPress: (market: PredictMarket) => void;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
}

type Side = PredictOutcome['side'];

const findOutcome = (
  market: PredictMarket,
  side: Side,
): PredictOutcome | undefined =>
  market.outcomes.find((outcome) => outcome.side === side);

const SIDE_LABEL_IDS: Record<Side, string> = {
  yes: 'predict_next.portfolio.outcome_side.yes',
  no: 'predict_next.portfolio.outcome_side.no',
};

/** One side of the card: its label over a quote bar, and the price to order it. */
const SideRow = ({
  market,
  title,
  outcome,
  color,
  onOrder,
}: {
  market: PredictMarket;
  title: string;
  outcome: PredictOutcome;
  color: string;
  onOrder?: MarketStandardCardProps['onOrder'];
}) => {
  const { side } = outcome;
  const label = strings(SIDE_LABEL_IDS[side]);
  const price = formatAskPrice(outcome.askPrice);

  return (
    <OutcomeRow.Root testID={MarketStandardCardTestIds.row(market.id, side)}>
      <OutcomeRow.Label
        label={label}
        percent={getAskPricePercent(outcome.askPrice)}
        color={color}
        lineTestID={MarketStandardCardTestIds.line(market.id, side)}
      />
      <OutcomeRow.Price
        price={price}
        color={color}
        isDisabled={!isOutcomeTradeable(market, outcome)}
        onPress={() => onOrder?.(market, outcome)}
        accessibilityLabel={strings(
          'predict_next.event.standard_outcome_accessibility_label',
          {
            title,
            outcome: label,
            price: price ?? strings('predict.market_groups.price_unavailable'),
          },
        )}
        testID={
          side === 'yes'
            ? MarketStandardCardTestIds.yesButton(market.id)
            : MarketStandardCardTestIds.noButton(market.id)
        }
      />
    </OutcomeRow.Root>
  );
};

/**
 * A yes/no Market as one card: the yes Outcome's label as its title, then a
 * Yes row and a No row, each with its quote bar and the price that orders it.
 */
export const MarketStandardCard = React.memo(
  ({ market, onRulesPress, onOrder }: MarketStandardCardProps) => {
    const { colors } = useTheme();
    const rules = market.rules?.trim();
    const yesOutcome = findOutcome(market, 'yes');
    const noOutcome = findOutcome(market, 'no');

    if (!yesOutcome || !noOutcome) {
      return null;
    }

    const title = yesOutcome.label;

    return (
      <MarketCard.Root testID={MarketStandardCardTestIds.card(market.id)}>
        <MarketCard.Title
          testID={MarketStandardCardTestIds.title(market.id)}
          onPress={rules ? () => onRulesPress(market) : undefined}
          accessibilityHint={strings(
            'predict.rules.market_accessibility_label',
          )}
        >
          {title}
        </MarketCard.Title>
        <Box twClassName="gap-3">
          <SideRow
            market={market}
            title={title}
            outcome={yesOutcome}
            color={colors.success.default}
            onOrder={onOrder}
          />
          <SideRow
            market={market}
            title={title}
            outcome={noOutcome}
            color={colors.error.default}
            onOrder={onOrder}
          />
        </Box>
      </MarketCard.Root>
    );
  },
);

MarketStandardCard.displayName = 'MarketStandardCard';
