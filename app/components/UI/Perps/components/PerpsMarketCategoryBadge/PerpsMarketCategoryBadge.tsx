import React from 'react';
import { Pressable } from 'react-native';
import {
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './PerpsMarketCategoryBadge.styles';
import type { PerpsMarketCategoryBadgeProps } from './PerpsMarketCategoryBadge.types';

/**
 * PerpsMarketCategoryBadge - Interactive badge for category filtering
 *
 * Supports two modes:
 * - Text mode (default): renders a text label pill.
 * - Icon mode: when `icon` is provided, renders an icon-only pill (same size/shape).
 *
 * @example
 * ```tsx
 * // Text badge
 * <PerpsMarketCategoryBadge
 *   label="Crypto"
 *   accessibilityLabel="Crypto"
 *   isSelected={selectedCategory === 'crypto'}
 *   onPress={() => handleCategoryPress('crypto')}
 * />
 *
 * // Icon-only badge (e.g. watchlist star)
 * <PerpsMarketCategoryBadge
 *   icon={IconName.Star}
 *   accessibilityLabel="Watchlist"
 *   isSelected={showFavoritesOnly}
 *   onPress={onWatchlistToggle}
 * />
 * ```
 */
const PerpsMarketCategoryBadge: React.FC<PerpsMarketCategoryBadgeProps> = ({
  label,
  icon,
  accessibilityLabel,
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
      accessibilityLabel={accessibilityLabel}
    >
      {icon ? (
        <Icon
          name={icon as IconName}
          size={IconSize.Md}
          color={isSelected ? IconColor.PrimaryInverse : IconColor.IconDefault}
        />
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.badgeText}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

export default PerpsMarketCategoryBadge;
