import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { PredictMarket } from '../../types';
import { MarketGroupCard, type MarketGroupCardProps } from './MarketGroupCard';

export type SpreadMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

const getSpreadTitle = (market: PredictMarket): string =>
  market.outcomes.find((outcome) => outcome.side === 'yes')?.label.trim() ||
  strings('predict.market_groups.spread');

export const SpreadMarketGroupCard = ({
  selectedMarket,
  ...props
}: SpreadMarketGroupCardProps) => (
  <MarketGroupCard
    {...props}
    selectedMarket={selectedMarket}
    title={getSpreadTitle(selectedMarket)}
  />
);
