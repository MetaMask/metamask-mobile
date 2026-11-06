import React, { useCallback, useEffect } from 'react';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import { useGameTeamColors } from '../../../events/game';
import {
  ChoiceMarketGroupCard,
  MarketStandardCard,
  MoneylineMarketGroupCard,
  SpreadMarketGroupCard,
  ThresholdMarketGroupCard,
  TotalMarketGroupCard,
} from '../../../events/markets';
import type {
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import type { MarketLayoutCard } from './createMarketLayoutProjection';

export interface EventMarketLayoutCardProps {
  card: MarketLayoutCard;
  game?: PredictGame;
  /** The line chosen in this card's picker, if any. */
  selectedMarketId?: PredictMarket['id'];
  onSelectMarket: (groupKey: string, marketId: PredictMarket['id']) => void;
  onOrder: (market: PredictMarket, outcome: PredictOutcome) => void;
  onRulesPress: (market: PredictMarket) => void;
}

const StandardCards = ({
  markets,
  onOrder,
  onRulesPress,
}: {
  markets: readonly PredictMarket[];
  onOrder: EventMarketLayoutCardProps['onOrder'];
  onRulesPress: EventMarketLayoutCardProps['onRulesPress'];
}) => (
  <>
    {markets.map((market) => (
      <MarketStandardCard
        key={market.id}
        market={market}
        onOrder={onOrder}
        onRulesPress={onRulesPress}
      />
    ))}
  </>
);

/** Lines of a market type with no card yet: one standard card per line. */
const UnknownLineCards = ({
  marketType,
  ...props
}: {
  marketType: string;
  markets: readonly PredictMarket[];
  onOrder: EventMarketLayoutCardProps['onOrder'];
  onRulesPress: EventMarketLayoutCardProps['onRulesPress'];
}) => {
  useEffect(() => {
    DevLogger.log(
      `[PredictNext] No card for marketType "${marketType}"; showing its lines as standard cards`,
    );
  }, [marketType]);

  return <StandardCards {...props} />;
};

/**
 * A team total is titled with its Team: the one its yes Outcome backs.
 * Without a Game or a Team, it reads "Team total".
 */
const getTeamTotalTitle = (
  markets: readonly PredictMarket[],
  game?: PredictGame,
): string => {
  const selection = markets[0]?.outcomes.find(
    (outcome) => outcome.side === 'yes',
  )?.gameSelection;
  const team =
    selection === 'home'
      ? game?.homeTeam
      : selection === 'away'
        ? game?.awayTeam
        : undefined;
  return team?.name ?? strings('predict_next.event.market_layout.team_total');
};

/**
 * A moneyline backs a different Team (or the tie) on every row. Rows that all
 * back one Team, or a single row, can't tell, so neither is one.
 */
const isMoneyline = (markets: readonly PredictMarket[]): boolean => {
  const selections = markets.map(
    (market) =>
      market.outcomes.find((outcome) => outcome.side === 'yes')
        ?.gameSelection ?? 'tie',
  );
  return (
    selections.length > 1 && new Set(selections).size === selections.length
  );
};

/**
 * A choice card read from its outcome labels: each row in the color of the Team its yes side backs, without an avatar;
 * neutral without a Game or a Team. Untitled when the backend sent no label.
 */
const LabelledChoiceCard = ({
  game,
  ...props
}: {
  groupKey: string;
  markets: readonly PredictMarket[];
  title?: string;
  game?: PredictGame;
  onOrder: EventMarketLayoutCardProps['onOrder'];
}) => {
  const { colors } = useTheme();
  const teamColors = useGameTeamColors(game);
  const describeRow = useCallback(
    (_market: PredictMarket, yes: PredictOutcome) => {
      const selection = yes.gameSelection;
      return {
        label: yes.label,
        color:
          game && (selection === 'home' || selection === 'away')
            ? teamColors[selection]
            : colors.text.alternative,
      };
    },
    [colors.text.alternative, game, teamColors],
  );

  return <ChoiceMarketGroupCard {...props} describeRow={describeRow} />;
};

/**
 * Renders one projected card with the component for its group's shape. Line
 * pickers have no title or rules button: the section header names them. A
 * threshold picker is the exception: it's titled with its label and line.
 */
export const EventMarketLayoutCard = ({
  card,
  game,
  selectedMarketId,
  onSelectMarket,
  onOrder,
  onRulesPress,
}: EventMarketLayoutCardProps) => {
  if (card.type === 'standard') {
    return (
      <MarketStandardCard
        market={card.market}
        onOrder={onOrder}
        onRulesPress={onRulesPress}
      />
    );
  }

  if (card.type === 'choice') {
    const label = card.markets.find((market) => market.group?.label)?.group
      ?.label;
    if (label === undefined && !game) {
      return (
        <StandardCards
          markets={card.markets}
          onOrder={onOrder}
          onRulesPress={onRulesPress}
        />
      );
    }
    if (label === undefined && game && isMoneyline(card.markets)) {
      return (
        <MoneylineMarketGroupCard
          groupKey={card.key}
          markets={card.markets}
          game={game}
          onOrder={onOrder}
        />
      );
    }
    return (
      <LabelledChoiceCard
        groupKey={card.key}
        markets={card.markets}
        title={label}
        game={game}
        onOrder={onOrder}
      />
    );
  }

  const selectedMarket =
    card.markets.find((market) => market.id === selectedMarketId) ??
    card.markets[0];
  const groupProps = {
    groupKey: card.key,
    markets: card.markets,
    selectedMarket,
    onSelectMarket: (marketId: PredictMarket['id']) =>
      onSelectMarket(card.key, marketId),
    onOrder,
  };

  switch (card.marketType) {
    case PREDICT_MARKET_TYPES.SPREAD:
      return <SpreadMarketGroupCard {...groupProps} game={game} />;
    case PREDICT_MARKET_TYPES.TOTAL:
      return <TotalMarketGroupCard {...groupProps} />;
    case PREDICT_MARKET_TYPES.THRESHOLD:
      return (
        <ThresholdMarketGroupCard {...groupProps} onRulesPress={onRulesPress} />
      );
    case PREDICT_MARKET_TYPES.TEAM_TOTAL:
      return (
        <TotalMarketGroupCard
          {...groupProps}
          title={getTeamTotalTitle(card.markets, game)}
        />
      );
    default:
      return (
        <UnknownLineCards
          marketType={card.marketType}
          markets={card.markets}
          onOrder={onOrder}
          onRulesPress={onRulesPress}
        />
      );
  }
};
