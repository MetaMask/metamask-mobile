import React, { type ReactNode } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import PerpsMarketInlineHeader from '../PerpsMarketInlineHeader';

interface PerpsMarketHeaderProps {
  market: PerpsMarketData;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  onMarketListPress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  /** Current price from candle stream - syncs header with chart */
  currentPrice: number;
  endAccessory?: ReactNode;
  useDetailLayout?: boolean;
}

const PerpsMarketHeader: React.FC<PerpsMarketHeaderProps> = (props) => (
  <PerpsMarketInlineHeader {...props} />
);

export default PerpsMarketHeader;
