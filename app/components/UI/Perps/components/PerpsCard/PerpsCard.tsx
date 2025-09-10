import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  formatPrice,
  formatPnl,
  formatPercentage,
} from '../../utils/formatUtils';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsCard.styles';
import type { PerpsCardProps } from './PerpsCard.types';
import { TouchableOpacity } from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase/ButtonBase';

/**
 * PerpsCard Component
 *
 * A unified card component for displaying both positions and orders in the Perps tab.
 * Handles navigation to the market details screen when pressed.
 */
const PerpsCard: React.FC<PerpsCardProps> = ({
  position,
  order,
  onPress,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Determine which type of data we have
  const symbol = position?.coin || order?.symbol || '';

  // Get all markets data to find the specific market when navigating
  const { markets } = usePerpsMarkets();

  // Calculate display values
  let primaryText = '';
  let secondaryText = '';
  let valueText = '';
  let labelText = '';
  let valueColor = TextColor.Default;

  if (position) {
    const leverage = position.leverage.value;
    const isLong = parseFloat(position.size) > 0;
    primaryText = `${position.coin} ${leverage}x ${isLong ? 'long' : 'short'}`;
    secondaryText = `${Math.abs(parseFloat(position.size))} ${position.coin}`;

    // Calculate PnL display
    const pnlValue = parseFloat(position.unrealizedPnl);
    valueColor = pnlValue >= 0 ? TextColor.Success : TextColor.Error;
    valueText = formatPrice(position.positionValue, {
      minimumDecimals: 2,
      maximumDecimals: 2,
    });
    const roeValue = parseFloat(position.returnOnEquity) * 100;
    labelText = `${formatPnl(pnlValue)} (${formatPercentage(roeValue, 1)})`;
  } else if (order) {
    primaryText = `${order.symbol} ${order.side === 'buy' ? 'long' : 'short'}`;
    secondaryText = `${order.originalSize} ${order.symbol}`;
    const orderValue = parseFloat(order.originalSize) * parseFloat(order.price);
    valueText = formatPrice(orderValue, { maximumDecimals: 2 });
    labelText = strings('perps.order.limit');
  }

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (markets.length > 0 && symbol) {
      // Find the market data for this symbol
      const market = markets.find((m) => m.symbol === symbol);
      if (market) {
        const initialTab = order ? 'orders' : position ? 'position' : undefined;
        // Navigate to market details with the full market data
        // When navigating from a tab, we need to navigate through the root stack
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market,
            initialTab,
          },
        });
      }
    }
    // Note: TouchableOpacity is now disabled when markets are loading or empty
    // This prevents the appearance of inactive touchables
  }, [onPress, markets, symbol, navigation, order, position]);

  if (!position && !order) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={markets.length === 0}
      testID={testID}
    >
      <View style={styles.cardContent}>
        {/* Left side: Icon and info */}
        <View style={styles.cardLeft}>
          {symbol && (
            <PerpsTokenLogo
              symbol={symbol}
              size={40}
              style={styles.assetIcon}
            />
          )}
          <View style={styles.cardInfo}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {primaryText}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {secondaryText}
            </Text>
          </View>
        </View>

        {/* Right side: Value and label */}
        <View style={styles.cardRight}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {valueText}
          </Text>
          <Text variant={TextVariant.BodySM} color={valueColor}>
            {labelText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsCard;
