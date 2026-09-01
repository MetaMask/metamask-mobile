import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  MarketGroupCard,
  type MarketGroupCardProps,
} from './internal/MarketGroupCard';

export type SpreadMarketGroupCardProps = Omit<MarketGroupCardProps, 'title'>;

export const SpreadMarketGroupCard = React.memo((
  props: SpreadMarketGroupCardProps,
): React.JSX.Element => (
    <MarketGroupCard
      {...props}
      title={strings('predict.market_groups.spread')}
    />
  ));
