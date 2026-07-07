import React from 'react';
import { View, ViewStyle } from 'react-native';
import {
  IconName,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';

interface StockBadgeProps {
  /**
   * The token to check for trading status.
   * If provided, the clock icon will only show when trading is NOT open.
   * Accepts any token object that may have rwaData.
   */
  token?: BridgeToken;
  style?: ViewStyle;
}

/**
 * StockBadge component displays a badge indicating that a token is a stock/RWA token.
 * Shows a clock icon when the market is closed to indicate trading is not available.
 */
const StockBadge: React.FC<StockBadgeProps> = ({ token, style }) => {
  const { isTokenTradingOpen } = useRWAToken();
  const showAfterHoursIcon = !isTokenTradingOpen(token);

  return (
    <View style={style}>
      <Tag
        severity={TagSeverity.Neutral}
        startIconName={showAfterHoursIcon ? IconName.AfterHours : undefined}
      >
        {strings('token.stock')}
      </Tag>
    </View>
  );
};

export default StockBadge;
