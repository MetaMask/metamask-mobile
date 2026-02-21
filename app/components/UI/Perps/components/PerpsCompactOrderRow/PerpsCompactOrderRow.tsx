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
import { getPerpsDisplaySymbol, type Order } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  formatOrderLabel,
  resolveOrderDisplayPriceAndLabel,
} from '../../utils/orderUtils';
import styleSheet from './PerpsCompactOrderRow.styles';
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
  const { styles } = useStyles(styleSheet, {});

  const orderInfo = useMemo(() => {
    const { priceValue, labelKey } = resolveOrderDisplayPriceAndLabel(order);
    const formattedPrice =
      priceValue !== null
        ? formatPerpsFiat(priceValue, {
            ranges: PRICE_RANGES_MINIMAL_VIEW,
          })
        : strings('perps.order.market');

    const orderTypeLabel = strings(labelKey);

    // Format size
    const size = Math.abs(parseFloat(order.size));
    const formattedSize = formatPositionSize(size.toString());
    const symbol = getPerpsDisplaySymbol(order.symbol);

    // Order type display (e.g., "Limit long", "Stop Market")
    const orderTypeDisplay = formatOrderLabel(order);

    return {
      orderTypeLabel,
      formattedPrice,
      formattedSize,
      symbol,
      orderTypeDisplay,
    };
  }, [order]);

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
            {orderInfo.orderTypeDisplay}
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
