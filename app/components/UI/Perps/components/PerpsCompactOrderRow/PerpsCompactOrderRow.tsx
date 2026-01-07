import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import {
  formatPositionSize,
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import styleSheet from './PerpsCompactOrderRow.styles';
import type { Order } from '../../controllers/types';
import PerpsTokenLogo from '../PerpsTokenLogo';

interface PerpsCompactOrderRowProps {
  order: Order;
  onPress?: () => void;
  testID?: string;
}

/**
 * PerpsCompactOrderRow Component
 *
 * A compact, single-line representation of an open order.
 * Designed for displaying non-TP/SL orders in a simplified list format.
 *
 * Shows:
 * - Order direction indicator (circle)
 * - Order type and direction (e.g., "Limit long")
 * - Price
 * - Size in asset units
 * - Order type label
 */
const PerpsCompactOrderRow: React.FC<PerpsCompactOrderRowProps> = ({
  order,
  onPress,
  testID,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const orderInfo = useMemo(() => {
    // Determine direction and color
    const isLong = order.side === 'buy';
    const direction = isLong ? 'long' : 'short';
    const directionColor = isLong
      ? theme.colors.success.default
      : theme.colors.error.default;

    // Format order type
    let orderTypeLabel = 'Limit price';
    if (order.detailedOrderType?.includes('Market')) {
      orderTypeLabel = 'Market price';
    } else if (order.isTrigger) {
      orderTypeLabel = 'Trigger price';
    }

    // Format price - trigger orders already have triggerPx mapped to price by adapter
    const priceValue = parseFloat(order.price || '0');
    const formattedPrice = formatPerpsFiat(priceValue, {
      ranges: PRICE_RANGES_MINIMAL_VIEW,
    });

    // Format size
    const size = Math.abs(parseFloat(order.size));
    const formattedSize = formatPositionSize(size.toString());
    const symbol = getPerpsDisplaySymbol(order.symbol);

    // Order type display (e.g., "Limit long", "Stop Market")
    const orderTypeDisplay = order.detailedOrderType || 'Limit';

    return {
      direction,
      directionColor,
      orderTypeLabel,
      formattedPrice,
      formattedSize,
      symbol,
      orderTypeDisplay,
      isLong,
    };
  }, [order, theme]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        {/* Token icon */}
        <PerpsTokenLogo symbol={order.symbol} size={40} />

        {/* Order info */}
        <View style={styles.infoContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {orderInfo.orderTypeDisplay} {orderInfo.direction}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {orderInfo.formattedSize} {orderInfo.symbol}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Default}
          style={styles.priceText}
        >
          {orderInfo.formattedPrice}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.labelText}
        >
          {orderInfo.orderTypeLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsCompactOrderRow;
