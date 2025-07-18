import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
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
import { createStyles } from './PerpsPositionListItem.styles';

interface PerpsPositionListItemProps {
  position: Position;
  onPress?: (position: Position) => void;
  disabled?: boolean;
}

/**
 * Compact position list item component
 * Shows the same data as PerpsPositionCard header but in a minified format
 */
const PerpsPositionListItem: React.FC<PerpsPositionListItemProps> = ({
  position,
  onPress,
  disabled,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const handlePress = () => {
    if (onPress) {
      onPress(position);
    } else {
      // Navigate to position details by default
      navigation.navigate('PerpsPositionDetails', {
        position,
        action: 'view',
      });
    }
  };

  const pnlNum = parseFloat(position.unrealizedPnl);
  const pnlPercentage = calculatePnLPercentageFromUnrealized({
    unrealizedPnl: pnlNum,
    entryPrice: parseFloat(position.entryPrice),
    size: parseFloat(position.size),
  });
  const isPositivePnl = pnlNum >= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled}
      testID={`perps-position-list-item-${position.coin}`}
    >
      <View style={styles.leftSection}>
        <View style={styles.headerRow}>
          <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
            {position.leverage.value}x{' '}
            <Text
              variant={TextVariant.BodySMMedium}
              color={isLong ? TextColor.Success : TextColor.Error}
            >
              {direction}
            </Text>
          </Text>
        </View>
        <View style={styles.headerRow}>
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Muted}>
            {formatPositionSize(absoluteSize.toString())} {position.coin}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.headerRow}>
          <Text variant={TextVariant.BodySMBold} color={TextColor.Default}>
            {formatPrice(position.positionValue)}
          </Text>
        </View>
        <View style={styles.headerRow}>
          <Text
            variant={TextVariant.BodySMBold}
            color={isPositivePnl ? TextColor.Success : TextColor.Error}
          >
            {formatPnl(pnlNum)} ({formatPercentage(pnlPercentage)})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PerpsPositionListItem;
