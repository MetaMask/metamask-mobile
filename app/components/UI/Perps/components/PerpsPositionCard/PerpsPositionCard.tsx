import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import {
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import type {
  PerpsNavigationParamList,
  Position,
} from '../../controllers/types';
import {
  formatPercentage,
  formatPnl,
  formatPrice,
  formatPositionSize,
} from '../../utils/formatUtils';
import { calculatePnLPercentageFromUnrealized } from '../../utils/pnlCalculations';
import { createStyles } from './PerpsPositionCard.styles';

interface PerpsPositionCardProps {
  position: Position;
  onClose?: (position: Position) => void;
  onEdit?: (position: Position) => void;
  disabled?: boolean;
  priceChange24h?: number; // 24hr price change in percentage
  priceChange24hFiat?: number; // 24hr price change in fiat
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  onClose,
  onEdit,
  disabled,
  priceChange24h = 0,
  priceChange24hFiat = 0,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const handleCardPress = async () => {
    // await triggerSelectionHaptic();
    navigation.navigate('PerpsPositionDetails', {
      position,
      action: 'view',
    });
  };

  const handleClosePress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    // await triggerSelectionHaptic();
    if (onClose) {
      onClose(position);
    } else {
      // Navigate to position details with close action
      navigation.navigate('PerpsPositionDetails', {
        position,
        action: 'close',
      });
    }
  };

  const handleEditPress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    // await triggerSelectionHaptic();
    if (onEdit) {
      onEdit(position);
    } else {
      // Navigate to position details with edit action
      navigation.navigate('PerpsPositionDetails', {
        position,
        action: 'edit',
      });
    }
  };

  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
  });

  const isPositive24h = priceChange24h >= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCardPress}
      testID="PerpsPositionCard"
      disabled={disabled}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerRow}>
            <Text style={styles.leverageText}>
              {position.leverage.value}x{' '}
              <Text
                style={[
                  styles.directionText,
                  isLong ? styles.longText : styles.shortText,
                ]}
              >
                {direction}
              </Text>
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.tokenAmount}>
              {formatPositionSize(absoluteSize.toString())} {position.coin}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.headerRow}>
            <Text style={styles.positionValue}>
              {formatPrice(position.positionValue)}
            </Text>
          </View>
          <View style={styles.headerRow}>
            <Text
              style={
                isPositive24h
                  ? styles.positionValuePositive
                  : styles.positionValueNegative
              }
            >
              {formatPnl(priceChange24hFiat)} (
              {formatPercentage(priceChange24h)})
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.bodyRow}>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Entry Price</Text>
            <Text style={styles.bodyValue}>
              {formatPrice(position.entryPrice)}
            </Text>
          </View>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Market Price</Text>
            <Text style={styles.bodyValue}>
              {formatPrice(position.liquidationPrice || position.entryPrice)}
            </Text>
          </View>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Liquidity Price</Text>
            <Text style={styles.bodyValue}>
              {position.liquidationPrice
                ? formatPrice(position.liquidationPrice)
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.bodyRow}>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Take Profit</Text>
            <Text style={styles.bodyValue}>Not Set</Text>
          </View>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Stop Loss</Text>
            <Text style={styles.bodyValue}>Not Set</Text>
          </View>
          <View style={styles.bodyItem}>
            <Text style={styles.bodyLabel}>Margin</Text>
            <Text style={styles.bodyValue}>
              {formatPrice(position.marginUsed)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Auto}
          label="Edit TP/SL"
          onPress={handleEditPress}
          disabled={disabled}
          style={styles.footerButton}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Md}
          width={ButtonWidthTypes.Auto}
          label="Close Position"
          onPress={handleClosePress}
          disabled={disabled}
          style={styles.footerButton}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PerpsPositionCard;
