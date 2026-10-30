import React, { useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { PredictGame, PredictMarket, PredictOutcome } from '../../types';
import { useGameTeamColors, type GameSelection } from '../game';
import { formatMarketGroupOption } from '../shared/formatting';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type SpreadMarketGroupCardProps = Omit<
  MarketGroupCardProps,
  'title' | 'describeOutcome'
> & {
  /** The Event's Game; its Teams color the rows. */
  game?: PredictGame;
};

const OPPOSITE: Record<GameSelection, GameSelection> = {
  home: 'away',
  away: 'home',
};

/** The Team a spread row backs: the yes Outcome's Team, the other for no. */
const rowTeam = (
  market: PredictMarket,
  outcome: PredictOutcome,
): GameSelection | undefined => {
  const selection = market.outcomes.find(
    (candidate) => candidate.side === 'yes',
  )?.gameSelection;
  if (selection !== 'home' && selection !== 'away') return undefined;
  return outcome.side === 'yes' ? selection : OPPOSITE[selection];
};

/**
 * A spread line picker: each row is a Team with its handicap (`-7.5`, `+7.5`)
 * in the Team's color.
 */
export const SpreadMarketGroupCard = React.memo(
  ({ game, ...props }: SpreadMarketGroupCardProps): React.JSX.Element => {
    const { colors } = useTheme();
    const teamColors = useGameTeamColors(game);
    const describeOutcome = useCallback(
      (market: PredictMarket, outcome: PredictOutcome) => {
        const team = rowTeam(market, outcome);
        return {
          color: team
            ? teamColors[team]
            : outcome.side === 'yes'
              ? colors.success.default
              : colors.error.default,
          value: formatMarketGroupOption(market, outcome.side) ?? '—',
        };
      },
      [colors.error.default, colors.success.default, teamColors],
    );

    return (
      <MarketGroupCard
        {...props}
        title={strings('predict.market_groups.spread')}
        describeOutcome={describeOutcome}
      />
    );
  },
);
