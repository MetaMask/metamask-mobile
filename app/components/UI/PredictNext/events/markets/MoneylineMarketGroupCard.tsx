import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import type {
  PredictGame,
  PredictMarket,
  PredictOutcome,
  PredictTeam,
} from '../../types';
import {
  getTeamAbbreviation,
  useGameTeamColors,
  type GameSelection,
} from '../game';
import { TeamLogo } from '../shared/ui';
import {
  ChoiceMarketGroupCard,
  type ChoiceRowAppearance,
} from './ChoiceMarketGroupCard';
import { MoneylineMarketGroupCardTestIds } from './MoneylineMarketGroupCard.testIds';

export interface MoneylineMarketGroupCardProps {
  groupKey: string;
  /** The Markets of one moneyline `choice` group, one per option. */
  markets: readonly PredictMarket[];
  game: PredictGame;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
}

const toSelection = (outcome: PredictOutcome): GameSelection | undefined =>
  outcome.gameSelection === 'home' || outcome.gameSelection === 'away'
    ? outcome.gameSelection
    : undefined;

const teamOf = (game: PredictGame, selection: GameSelection): PredictTeam =>
  selection === 'home' ? game.homeTeam : game.awayTeam;

/**
 * A moneyline: a choice card with no title, one row per option. Team rows
 * show the Team logo, name and color; an option without a Team (a period
 * tie) uses a neutral avatar and color.
 */
export const MoneylineMarketGroupCard = React.memo(
  ({ groupKey, markets, game, onOrder }: MoneylineMarketGroupCardProps) => {
    const { colors } = useTheme();
    const teamColors = useGameTeamColors(game);
    const describeRow = useCallback(
      (market: PredictMarket, yes: PredictOutcome): ChoiceRowAppearance => {
        const selection = toSelection(yes);
        const team = selection ? teamOf(game, selection) : undefined;
        return {
          label: team?.name ?? yes.label,
          color: selection ? teamColors[selection] : colors.text.alternative,
          leading: team ? (
            <TeamLogo
              team={team}
              abbreviation={getTeamAbbreviation(team)}
              size="medium"
              testID={MoneylineMarketGroupCardTestIds.logo(groupKey, market.id)}
              fallbackTestID={MoneylineMarketGroupCardTestIds.logoFallback(
                groupKey,
                market.id,
              )}
            />
          ) : (
            <Box
              twClassName="h-10 w-10 rounded-full bg-muted"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={MoneylineMarketGroupCardTestIds.logoFallback(
                groupKey,
                market.id,
              )}
            />
          ),
        };
      },
      [colors.text.alternative, game, groupKey, teamColors],
    );

    return (
      <ChoiceMarketGroupCard
        groupKey={groupKey}
        markets={markets}
        describeRow={describeRow}
        onOrder={onOrder}
        testIds={MoneylineMarketGroupCardTestIds}
      />
    );
  },
);

MoneylineMarketGroupCard.displayName = 'MoneylineMarketGroupCard';
