import React, { useCallback } from 'react';
import { useTheme } from '../../../../../util/theme';
import type { PredictGame, PredictMarket, PredictOutcome } from '../../types';
import {
  getGameTeamOrder,
  useGameTeamColors,
  type GameSelection,
  type GameTeamOrder,
} from '../game';
import { formatMarketGroupOption } from '../shared/formatting';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type SpreadMarketGroupCardProps = Omit<
  MarketGroupCardProps,
  'describeOutcome' | 'orderSides'
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

const YES_FIRST = ['yes', 'no'] as const;
const NO_FIRST = ['no', 'yes'] as const;

/**
 * Rows follow the Game's Team order, whichever Team the selected line's yes
 * side backs. Without a Team, yes comes first.
 */
const orderSides = (teamOrder: GameTeamOrder, market: PredictMarket) => {
  const yes = market.outcomes.find((outcome) => outcome.side === 'yes');
  const yesTeam = yes ? rowTeam(market, yes) : undefined;
  return yesTeam === undefined || yesTeam === teamOrder[0]
    ? YES_FIRST
    : NO_FIRST;
};

/**
 * A spread line picker: each row is a Team with its handicap (`-7.5`, `+7.5`)
 * in the Team's color, Teams in the Game's order.
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
    const teamOrder = getGameTeamOrder(game);
    const orderGameSides = useCallback(
      (market: PredictMarket) => orderSides(teamOrder, market),
      [teamOrder],
    );

    return (
      <MarketGroupCard
        {...props}
        describeOutcome={describeOutcome}
        orderSides={orderGameSides}
      />
    );
  },
);
