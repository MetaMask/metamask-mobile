import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type TotalMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

export function TotalMarketGroupCard(
  props: TotalMarketGroupCardProps,
): React.JSX.Element {
  return (
    <MarketGroupCard
      {...props}
      title={strings('predict.market_groups.total_points')}
    />
  );
}
