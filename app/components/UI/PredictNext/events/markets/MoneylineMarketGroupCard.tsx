import React, { useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
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
import { formatAskPrice, getAskPricePercent } from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { OutcomeRow, TeamLogo } from '../shared/ui';
import { MarketCard } from './internal/MarketCard';
import { MoneylineMarketGroupCardTestIds } from './MoneylineMarketGroupCard.testIds';

export interface MoneylineMarketGroupCardProps {
  groupKey: string;
  /** The Markets of one moneyline `choice` group, one per option. */
  markets: readonly PredictMarket[];
  game: PredictGame;
  onOrder?: (market: PredictMarket, outcome: PredictOutcome) => void;
}

interface ChoiceRow {
  market: PredictMarket;
  yes: PredictOutcome;
  /** Undefined for an option without a Team, such as a period tie. */
  selection?: GameSelection;
}

const toSelection = (outcome: PredictOutcome): GameSelection | undefined =>
  outcome.gameSelection === 'home' || outcome.gameSelection === 'away'
    ? outcome.gameSelection
    : undefined;

/** Rows in the group's display order (away, tie, home), then response order. */
const toRows = (markets: readonly PredictMarket[]): ChoiceRow[] =>
  markets
    .map((market, index) => ({
      market,
      yes: market.outcomes.find((outcome) => outcome.side === 'yes'),
      order: market.group?.displayOrder ?? index,
    }))
    .filter(
      (row): row is typeof row & { yes: PredictOutcome } =>
        row.yes !== undefined,
    )
    .sort((left, right) => left.order - right.order)
    .map(({ market, yes }) => ({ market, yes, selection: toSelection(yes) }));

const teamOf = (game: PredictGame, selection: GameSelection): PredictTeam =>
  selection === 'home' ? game.homeTeam : game.awayTeam;

/**
 * A moneyline: one row per option, each priced by its Market's yes side.
 * Team rows show the Team logo and color; an option without a Team (a period
 * tie) uses a neutral avatar and color.
 */
export const MoneylineMarketGroupCard = React.memo(
  ({ groupKey, markets, game, onOrder }: MoneylineMarketGroupCardProps) => {
    const { colors } = useTheme();
    const teamColors = useGameTeamColors(game);
    const rows = useMemo(() => toRows(markets), [markets]);

    if (rows.length === 0) {
      return null;
    }

    return (
      <MarketCard.Root testID={MoneylineMarketGroupCardTestIds.card(groupKey)}>
        <Box twClassName="gap-3">
          {rows.map(({ market, yes, selection }) => {
            const team = selection ? teamOf(game, selection) : undefined;
            const label = team?.name ?? yes.label;
            const color = selection
              ? teamColors[selection]
              : colors.text.alternative;
            const price = formatAskPrice(yes.askPrice);

            return (
              <OutcomeRow.Root
                key={market.id}
                testID={MoneylineMarketGroupCardTestIds.row(
                  groupKey,
                  market.id,
                )}
              >
                {team ? (
                  <TeamLogo
                    team={team}
                    abbreviation={getTeamAbbreviation(team)}
                    size="medium"
                    testID={MoneylineMarketGroupCardTestIds.logo(
                      groupKey,
                      market.id,
                    )}
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
                )}
                <OutcomeRow.Label
                  label={label}
                  percent={getAskPricePercent(yes.askPrice)}
                  color={color}
                  lineTestID={MoneylineMarketGroupCardTestIds.line(
                    groupKey,
                    market.id,
                  )}
                />
                <OutcomeRow.Price
                  price={price}
                  color={color}
                  isDisabled={!isOutcomeTradeable(market, yes)}
                  onPress={() => onOrder?.(market, yes)}
                  accessibilityLabel={strings(
                    'predict.market_groups.choice_accessibility_label',
                    {
                      option: label,
                      price:
                        price ??
                        strings('predict.market_groups.price_unavailable'),
                    },
                  )}
                  testID={MoneylineMarketGroupCardTestIds.price(
                    groupKey,
                    market.id,
                  )}
                />
              </OutcomeRow.Root>
            );
          })}
        </Box>
      </MarketCard.Root>
    );
  },
);

MoneylineMarketGroupCard.displayName = 'MoneylineMarketGroupCard';
