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
import { getBadgeLabelText } from './getBadgeLabelText';

interface StockBadgeProps {
  /**
   * The token to check for trading status.
   * If provided, the clock icon will only show when trading is NOT open.
   * Accepts any token object that may have rwaData.
   */
  token?: BridgeToken;
  /**
   * Server-provided badge label. Known labels are localized; unknown labels are shown as provided.
   * Defaults to the localized "Stock" label.
   */
  label?: string;
  style?: ViewStyle;
}

/**
 * StockBadge component displays a badge indicating that a token is a stock/RWA token.
 * Shows a clock icon when the market is closed to indicate trading is not available.
 */
const StockBadge: React.FC<StockBadgeProps> = ({ token, label, style }) => {
  const { isStockToken, isTokenTradingOpen } = useRWAToken();
  const showAfterHoursIcon = isStockToken(token) && !isTokenTradingOpen(token);

  return (
    <View style={style}>
      <Tag
        severity={TagSeverity.Neutral}
        startIconName={showAfterHoursIcon ? IconName.AfterHours : undefined}
      >
        {label ? getBadgeLabelText(label) : strings('token.stock')}
      </Tag>
    </View>
  );
};

export default StockBadge;
