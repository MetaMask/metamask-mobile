import React, { useEffect } from 'react';
import { DevLogger } from '../../../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import {
  MarketStandardCard,
  MoneylineMarketGroupCard,
  SpreadMarketGroupCard,
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

/** Renders one projected card with the component for its group's shape. */
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
    return game ? (
      <MoneylineMarketGroupCard
        groupKey={card.key}
        markets={card.markets}
        game={game}
        onOrder={onOrder}
      />
    ) : (
      <StandardCards
        markets={card.markets}
        onOrder={onOrder}
        onRulesPress={onRulesPress}
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
    onRulesPress,
  };

  switch (card.marketType) {
    case PREDICT_MARKET_TYPES.SPREAD:
      return <SpreadMarketGroupCard {...groupProps} game={game} />;
    case PREDICT_MARKET_TYPES.TOTAL:
      return <TotalMarketGroupCard {...groupProps} />;
    case PREDICT_MARKET_TYPES.TEAM_TOTAL:
      return (
        <TotalMarketGroupCard
          {...groupProps}
          title={strings('predict_next.event.market_layout.team_total')}
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
