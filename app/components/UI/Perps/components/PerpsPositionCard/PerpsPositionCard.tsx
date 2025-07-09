import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity, View, type GestureResponderEvent } from 'react-native';
import ButtonIcon, { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import type { PerpsNavigationParamList, Position } from '../../controllers/types';
import { formatPercentage, formatPnl, formatPrice, formatPositionSize } from '../../utils/formatUtils';
import { calculatePnLPercentageFromUnrealized } from '../../utils/pnlCalculations';
import { triggerSelectionHaptic } from '../../utils/hapticUtils';
import { createStyles } from './PerpsPositionCard.styles';

interface PerpsPositionCardProps {
  position: Position;
  onClose?: (position: Position) => void;
  onEdit?: (position: Position) => void;
}

// Styles moved to separate file for better organization

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

  // Format numbers for display - using shared utilities

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

  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size)
  });

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
            {formatPositionSize(position.size)} {position.coin}
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
            {formatPnl(pnlNum)}
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
