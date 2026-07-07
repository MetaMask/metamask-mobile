import React, { type ReactNode } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';
import PerpsMarketInlineHeader from '../PerpsMarketInlineHeader';

interface PerpsMarketHeaderProps {
  market: PerpsMarketData;
  onBackPress?: () => void;
  onMorePress?: () => void;
  onFavoritePress?: () => void;
  onFullscreenPress?: () => void;
  onCategorySearchPress?: () => void;
  isFavorite?: boolean;
  testID?: string;
  fullscreenButtonTestID?: string;
  /** Current price from candle stream - syncs header with chart */
  currentPrice: number;
  endAccessory?: ReactNode;
}

const PerpsMarketHeader: React.FC<PerpsMarketHeaderProps> = (props) => (
  <PerpsMarketInlineHeader {...props} />
);

export default PerpsMarketHeader;
