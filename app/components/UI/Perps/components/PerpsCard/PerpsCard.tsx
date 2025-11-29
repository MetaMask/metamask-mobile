import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
  formatPerpsFiat,
  formatPnl,
  formatPercentage,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import PerpsTokenLogo from '../PerpsTokenLogo';
import styleSheet from './PerpsCard.styles';
import type { PerpsCardProps } from './PerpsCard.types';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import {
  PerpsEventValues,
  PerpsEventProperties,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

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
  source,
  iconSize = HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE,
}) => {
  const { styles } = useStyles(styleSheet, { iconSize });
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { track } = usePerpsEventTracking();

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
    const displaySymbol = getPerpsDisplaySymbol(position.coin);
    primaryText = `${displaySymbol} ${leverage}x ${isLong ? 'long' : 'short'}`;
    secondaryText = `${Math.abs(parseFloat(position.size))} ${displaySymbol}`;

    // Calculate PnL display
    const pnlValue = parseFloat(position.unrealizedPnl);
    valueColor = pnlValue >= 0 ? TextColor.Success : TextColor.Error;
    valueText = formatPerpsFiat(position.positionValue, {
      ranges: PRICE_RANGES_MINIMAL_VIEW,
    });
    const roeValue = parseFloat(position.returnOnEquity) * 100;
    labelText = `${formatPnl(pnlValue)} (${formatPercentage(roeValue, 1)})`;
  } else if (order) {
    const displaySymbol = getPerpsDisplaySymbol(order.symbol);
    primaryText = `${displaySymbol} ${order.side === 'buy' ? 'long' : 'short'}`;
    secondaryText = `${order.originalSize} ${displaySymbol}`;
    const orderValue = parseFloat(order.originalSize) * parseFloat(order.price);
    valueText = formatPerpsFiat(orderValue, {
      ranges: PRICE_RANGES_MINIMAL_VIEW,
    });
    labelText = strings('perps.order.limit');
  }

  // Memoize market lookup to avoid array search on every press
  const market = useMemo(
    () => markets.find((m) => m.symbol === symbol),
    [markets, symbol],
  );

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (market) {
      // Track open position button click if this is a position
      if (position) {
        // Map source to button_location
        const buttonLocation =
          source === PerpsEventValues.SOURCE.POSITION_TAB
            ? PerpsEventValues.BUTTON_LOCATION.PERPS_TAB
            : PerpsEventValues.BUTTON_LOCATION.PERPS_HOME;

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.BUTTON_CLICKED,
          [PerpsEventProperties.BUTTON_CLICKED]:
            PerpsEventValues.BUTTON_CLICKED.OPEN_POSITION,
          [PerpsEventProperties.BUTTON_LOCATION]: buttonLocation,
        });
      }

      let initialTab: 'position' | 'orders' | undefined;
      if (order) {
        initialTab = 'orders';
      } else if (position) {
        initialTab = 'position';
      }
      // Navigate to market details with the full market data
      // When navigating from a tab, we need to navigate through the root stack
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          initialTab,
          source,
        },
      });
    }
  }, [onPress, market, navigation, order, position, source, track]);

  if (!position && !order) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={handlePress}
      testID={testID}
    >
      <View style={styles.cardContent}>
        {/* Left side: Icon and info */}
        <View style={styles.cardLeft}>
          {symbol && (
            <PerpsTokenLogo
              symbol={symbol}
              size={iconSize}
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
