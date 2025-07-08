import React from 'react';
import { StyleSheet, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { IconColor, IconName } from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import ButtonIcon, { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { Position, PerpsNavigationParamList } from '../controllers/types';
import { triggerSelectionHaptic } from '../utils/hapticUtils';

interface PerpsPositionCardProps {
  position: Position;
  onClose?: (position: Position) => void;
  onEdit?: (position: Position) => void;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    assetInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    assetName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginRight: 8,
    },
    directionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 8,
    },
    longBadge: {
      backgroundColor: colors.success.muted,
    },
    shortBadge: {
      backgroundColor: colors.error.muted,
    },
    directionText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    longText: {
      color: colors.success.default,
    },
    shortText: {
      color: colors.error.default,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailColumn: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.text.muted,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
    },
    pnlValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
    },
    leverageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    leverageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    leverageItem: {
      alignItems: 'center',
    },
    leverageLabel: {
      fontSize: 11,
      color: colors.text.muted,
    },
    leverageValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.default,
    },
  });

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  onClose,
  onEdit,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) > 0;
  const direction = isLong ? 'long' : 'short';

  // Format numbers for display
  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  const formatPnl = (pnl: string | number) => {
    const num = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num));
    return num >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const handleCardPress = async () => {
    await triggerSelectionHaptic();
    navigation.navigate('PerpsPositionDetails', {
      position,
      action: 'view'
    });
  };

  const handleClosePress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    await triggerSelectionHaptic();
    if (onClose) {
      onClose(position);
    } else {
      // Navigate to position details with close action
      navigation.navigate('PerpsPositionDetails', {
        position,
        action: 'close'
      });
    }
  };

  const handleEditPress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    await triggerSelectionHaptic();
    if (onEdit) {
      onEdit(position);
    } else {
      // Navigate to position details with edit action
      navigation.navigate('PerpsPositionDetails', {
        position,
        action: 'edit'
      });
    }
  };

  // Calculate PnL percentage
  const pnlNum = parseFloat(position.unrealizedPnl);
  const entryValue = parseFloat(position.entryPrice) * Math.abs(parseFloat(position.size));
  const pnlPercentage = entryValue > 0 ? (pnlNum / entryValue) * 100 : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={handleCardPress}>
      <View style={styles.header}>
        <View style={styles.assetInfo}>
          <Text style={styles.assetName}>{position.coin}</Text>
          <View style={[
            styles.directionBadge,
            isLong ? styles.longBadge : styles.shortBadge
          ]}>
            <Text style={[
              styles.directionText,
              isLong ? styles.longText : styles.shortText
            ]}>
              {direction}
            </Text>
          </View>
        </View>
        <View style={styles.actionsContainer}>
          <ButtonIcon
            iconName={IconName.Edit}
            iconColor={IconColor.Muted}
            size={ButtonIconSizes.Sm}
            onPress={handleEditPress}
          />
          <ButtonIcon
            iconName={IconName.Close}
            iconColor={IconColor.Error}
            size={ButtonIconSizes.Sm}
            onPress={handleClosePress}
          />
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Size</Text>
          <Text style={styles.detailValue}>
            {Math.abs(parseFloat(position.size)).toFixed(6)} {position.coin}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Entry Price</Text>
          <Text style={styles.detailValue}>
            {formatPrice(position.entryPrice)}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Mark Price</Text>
          <Text style={styles.detailValue}>
            {formatPrice(position.liquidationPrice || position.entryPrice)}
          </Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Unrealized P&L</Text>
          <Text style={[
            styles.pnlValue,
            pnlNum >= 0 ? styles.positivePnl : styles.negativePnl
          ]}>
            {formatPnl(position.unrealizedPnl)}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>P&L %</Text>
          <Text style={[
            styles.pnlValue,
            pnlPercentage >= 0 ? styles.positivePnl : styles.negativePnl
          ]}>
            {formatPercentage(pnlPercentage)}
          </Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.detailLabel}>Position Value</Text>
          <Text style={styles.detailValue}>
            {formatPrice(position.positionValue)}
          </Text>
        </View>
      </View>

      <View style={styles.leverageContainer}>
        <View style={styles.leverageInfo}>
          <View style={styles.leverageItem}>
            <Text style={styles.leverageLabel}>Leverage</Text>
            <Text style={styles.leverageValue}>{position.leverage.value}x</Text>
          </View>
          <View style={styles.leverageItem}>
            <Text style={styles.leverageLabel}>Margin Used</Text>
            <Text style={styles.leverageValue}>
              {formatPrice(position.marginUsed)}
            </Text>
          </View>
          <View style={styles.leverageItem}>
            <Text style={styles.leverageLabel}>Liq. Price</Text>
            <Text style={styles.leverageValue}>
              {formatPrice(position.liquidationPrice || '0')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsPositionCard;
