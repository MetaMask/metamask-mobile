import React from 'react';
import { Pressable } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './PerpsMarketCategoryBadge.styles';
import type { PerpsMarketCategoryBadgeProps } from './PerpsMarketCategoryBadge.types';

/**
 * PerpsMarketCategoryBadge - Interactive badge for category filtering
 *
 * Displays a pressable badge/pill for selecting market categories.
 *
 * @example
 * ```tsx
 * <PerpsMarketCategoryBadge
 *   label="Crypto"
 *   isSelected={selectedCategory === 'crypto'}
 *   onPress={() => handleCategoryPress('crypto')}
 * />
 * ```
 */
const PerpsMarketCategoryBadge: React.FC<PerpsMarketCategoryBadgeProps> = ({
  label,
  isSelected,
  onPress,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, { isSelected });

  return (
    <Pressable
      style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text variant={TextVariant.BodyMDMedium} style={styles.badgeText}>
        {label}
      </Text>
    </Pressable>
  );
};

export default PerpsMarketCategoryBadge;
