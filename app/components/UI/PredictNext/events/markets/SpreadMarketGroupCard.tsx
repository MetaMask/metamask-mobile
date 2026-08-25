import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { MarketGroupCard, type MarketGroupCardProps } from './MarketGroupCard';

export type SpreadMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

export const SpreadMarketGroupCard = ({
  ...props
}: SpreadMarketGroupCardProps) => (
  <MarketGroupCard {...props} title={strings('predict.market_groups.spread')} />
);
