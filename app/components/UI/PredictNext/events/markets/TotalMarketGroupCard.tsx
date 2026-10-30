import React, { useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { PredictMarket, PredictOutcome } from '../../types';
import { formatMarketGroupOption } from '../shared/formatting';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type TotalMarketGroupCardProps = Omit<
  MarketGroupCardProps,
  'title' | 'describeOutcome'
>;

/** The Outcome's initial as a line prefix: `O` for Over, `U` for Under. */
const linePrefix = (outcome: PredictOutcome): string =>
  outcome.label.trim().slice(0, 1).toUpperCase() || outcome.side.toUpperCase();

/**
 * A total points line picker: Over and Under rows with the prefixed line
 * (`O 228.5`, `U 228.5`), in the success and error colors.
 */
export const TotalMarketGroupCard = React.memo(
  (props: TotalMarketGroupCardProps): React.JSX.Element => {
    const { colors } = useTheme();
    const describeOutcome = useCallback(
      (market: PredictMarket, outcome: PredictOutcome) => ({
        color:
          outcome.side === 'yes'
            ? colors.success.default
            : colors.error.default,
        value: `${linePrefix(outcome)} ${
          formatMarketGroupOption(market, outcome.side) ?? '—'
        }`,
      }),
      [colors.error.default, colors.success.default],
    );

    return (
      <MarketGroupCard
        {...props}
        title={strings('predict.market_groups.total_points')}
        describeOutcome={describeOutcome}
      />
    );
  },
);
