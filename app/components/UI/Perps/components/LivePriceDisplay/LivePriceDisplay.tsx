import React, { memo } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { usePerpsLivePrices } from '../../hooks/stream';
import { formatPrice, formatPercentage } from '../../utils/formatUtils';

interface LivePriceDisplayProps {
  symbol: string;
  variant?: TextVariant;
  color?: TextColor;
  showChange?: boolean;
  testID?: string;
  throttleMs?: number;
}

/**
 * Component that displays live price updates
 * Subscribes to price stream independently to avoid parent re-renders
 */
const LivePriceDisplay: React.FC<LivePriceDisplayProps> = ({
  symbol,
  variant = TextVariant.BodyMD,
  color = TextColor.Default,
  showChange = false,
  testID,
  throttleMs = 1000, // Default to 1 second updates for price displays
}) => {
  const prices = usePerpsLivePrices({
    symbols: [symbol],
    throttleMs,
  });

  const priceData = prices[symbol];

  if (!priceData) {
    return (
      <Text variant={variant} color={color} testID={testID}>
        --
      </Text>
    );
  }

  const price = parseFloat(priceData.price);
  const change = parseFloat(priceData.percentChange24h || '0');

  if (showChange) {
    const changeColor = change >= 0 ? TextColor.Success : TextColor.Error;
    return (
      <View>
        <Text variant={variant} color={color} testID={testID}>
          {formatPrice(price)}
        </Text>
        <Text variant={TextVariant.BodySM} color={changeColor}>
          {formatPercentage(change)}
        </Text>
      </View>
    );
  }

  return (
    <Text variant={variant} color={color} testID={testID}>
      {formatPrice(price)}
    </Text>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
export default memo(LivePriceDisplay);
