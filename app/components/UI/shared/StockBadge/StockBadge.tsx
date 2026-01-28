import React, { useEffect, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import styleSheet from './StockBadge.styles';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { BridgeToken } from '../../Bridge/types';
import { Box } from '../../Box/Box';
import { hasRwaData } from '../../../../util/swaps/rwaUtils';

interface StockBadgeProps {
  /**
   * The token to check for trading status.
   * If provided, the clock icon will only show when trading is NOT open.
   * Accepts any token object that may have rwaData.
   */
  token?: unknown;
  style?: ViewStyle;
}

/**
 * StockBadge component displays a badge indicating that a token is a stock/RWA token.
 * Shows a clock icon when the market is closed to indicate trading is not available.
 */
const StockBadge: React.FC<StockBadgeProps> = ({ token, style }) => {
  const { styles } = useStyles(styleSheet, { style });
  const { isTokenTradingOpen } = useRWAToken();
  const [isTradingOpen, setIsTradingOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const checkTradingStatus = async () => {
      if (hasRwaData(token)) {
        const isOpen = await isTokenTradingOpen(token as BridgeToken);
        setIsTradingOpen(isOpen);
      } else {
        // If no token provided or no rwaData, assume trading is open (no icon)
        setIsTradingOpen(true);
      }
    };

    checkTradingStatus();
  }, [token, isTokenTradingOpen]);

  // Show clock icon only when trading is NOT open
  const showClockIcon = isTradingOpen === false;

  return (
    <Box style={styles.stockBadgeWrapper}>
      <View style={styles.stockBadge}>
        {showClockIcon && (
          <Icon
            name={IconName.ClockHalfDotted}
            size={IconSize.Xs}
            color={IconColor.Alternative}
          />
        )}
        <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
          {strings('token.stock')}
        </Text>
      </View>
    </Box>
  );
};

export default StockBadge;
