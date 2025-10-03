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
import {
  TouchablePerpsComponent,
  useCoordinatedPress,
} from '../PressablePerpsComponent/PressablePerpsComponent';

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

  const coordinatedPress = useCoordinatedPress();

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
  }, [onPress, markets, symbol, navigation, order, position]);

  const memoizedPressHandler = useCallback(() => {
    coordinatedPress(handlePress);
  }, [coordinatedPress, handlePress]);

  if (!position && !order) {
    return null;
  }

  return (
    <TouchablePerpsComponent
      style={styles.card}
      activeOpacity={0.7}
      onPress={memoizedPressHandler}
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
    </TouchablePerpsComponent>
  );
};

export default PerpsCard;
