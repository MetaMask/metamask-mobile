import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { MarketGroupCard, type MarketGroupCardProps } from './MarketGroupCard';

export type TotalMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

export const TotalMarketGroupCard = ({
  selectedMarket,
  ...props
}: TotalMarketGroupCardProps) => (
  <MarketGroupCard
    {...props}
    selectedMarket={selectedMarket}
    title={strings('predict.market_groups.total_points')}
  />
);
