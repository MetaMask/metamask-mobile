import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './PerpsMarketCategoryBadge.styles';
import type { PerpsMarketCategoryBadgeProps } from './PerpsMarketCategoryBadge.types';

/**
 * PerpsMarketCategoryBadge - Interactive badge for category filtering
 *
 * Displays a pressable badge/pill for selecting market categories.
 * When selected and showDismiss is true, shows an "×" icon to clear the filter.
 *
 * @example
 * ```tsx
 * <PerpsMarketCategoryBadge
 *   category="crypto"
 *   label="Crypto"
 *   isSelected={selectedCategory === 'crypto'}
 *   showDismiss={selectedCategory === 'crypto'}
 *   onPress={() => setSelectedCategory('crypto')}
 *   onDismiss={() => setSelectedCategory('all')}
 * />
 * ```
 */
const PerpsMarketCategoryBadge: React.FC<PerpsMarketCategoryBadgeProps> = ({
  label,
  isSelected,
  showDismiss = false,
  onPress,
  onDismiss,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, { isSelected });

  const handlePress = useCallback(() => {
    if (showDismiss && onDismiss) {
      // If showing dismiss and clicked, treat as dismiss
      onDismiss();
    } else {
      onPress();
    }
  }, [showDismiss, onDismiss, onPress]);

  return (
    <Pressable
      style={({ pressed }) => [styles.badge, pressed && styles.badgePressed]}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <Text variant={TextVariant.BodySM} style={styles.badgeText}>
        {label}
      </Text>
      {showDismiss && (
        <Icon
          name={IconName.Close}
          size={IconSize.Xs}
          color={IconColor.Inverse}
          testID={testID ? `${testID}-dismiss` : undefined}
        />
      )}
    </Pressable>
  );
};

export default PerpsMarketCategoryBadge;
