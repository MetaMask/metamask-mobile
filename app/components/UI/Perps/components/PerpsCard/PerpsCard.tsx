import React, { useCallback } from 'react';
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
import { formatPrice, formatPnl } from '../../utils/formatUtils';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import RemoteImage from '../../../../Base/RemoteImage';
import styleSheet from './PerpsCard.styles';
import type { PerpsCardProps } from './PerpsCard.types';

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
  const { assetUrl } = usePerpsAssetMetadata(symbol);

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
    valueText = formatPnl(pnlValue);
    const roeValue = parseFloat(position.returnOnEquity);
    labelText = `${roeValue >= 0 ? '+' : ''}${roeValue.toFixed(2)}%`;
  } else if (order) {
    primaryText = `${order.symbol} ${order.side === 'buy' ? 'long' : 'short'}`;
    secondaryText = `${order.originalSize} ${order.symbol}`;
    const orderValue = parseFloat(order.originalSize) * parseFloat(order.price);
    valueText = formatPrice(orderValue);
    labelText = strings('perps.order.limit');
  }

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (markets.length > 0 && symbol) {
      // Find the market data for this symbol
      const market = markets.find((m) => m.symbol === symbol);
      if (market) {
        // Navigate to market details with the full market data
        // When navigating from a tab, we need to navigate through the root stack
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market,
          },
        });
      }
    }
  }, [onPress, markets, symbol, navigation]);

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
          {assetUrl && (
            <RemoteImage source={{ uri: assetUrl }} style={styles.assetIcon} />
          )}
          <View style={styles.cardInfo}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {primaryText}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {secondaryText}
            </Text>
          </View>
        </View>

        {/* Right side: Value and label */}
        <View style={styles.cardRight}>
          <Text variant={TextVariant.BodyMDMedium} color={valueColor}>
            {valueText}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {labelText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsCard;
