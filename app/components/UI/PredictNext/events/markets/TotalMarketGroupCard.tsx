import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type TotalMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

export const TotalMarketGroupCard = React.memo(
  (props: TotalMarketGroupCardProps): React.JSX.Element => (
    <MarketGroupCard
      {...props}
      title={strings('predict.market_groups.total_points')}
    />
  ),
);
