import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';

export interface PerpsRowSkeletonProps {
  /**
   * Number of skeleton rows to render
   */
  count?: number;
  /**
   * Size of the icon skeleton (defaults to HOME_SCREEN_CONFIG.DefaultIconSize)
   */
  iconSize?: number;
  /**
   * Optional style for the container
   */
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSkeleton: {
    borderRadius: 100, // Fully circular
    marginRight: 12,
  },
  textInfo: {
    flex: 1,
    gap: 6,
  },
  primaryText: {
    marginBottom: 0,
  },
  secondaryText: {
    marginBottom: 0,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  valueText: {
    marginBottom: 0,
  },
  labelText: {
    marginBottom: 0,
  },
});

/**
 * PerpsRowSkeleton Component
 *
 * A flexible skeleton loader for Perps rows (positions, orders, markets, activity).
 * Mimics the structure of PerpsCard and PerpsMarketRowItem.
 *
 * @example
 * ```tsx
 * <PerpsRowSkeleton count={3} />
 * ```
 */
const PerpsRowSkeleton: React.FC<PerpsRowSkeletonProps> = ({
  count = 1,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  style,
}) => {
  // Generate array for count
  const rows = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {rows.map((index) => (
        <View key={index} style={[styles.row, style]}>
          {/* Left section: Icon + Info */}
          <View style={styles.leftSection}>
            {/* Circular icon skeleton */}
            <Skeleton
              height={iconSize}
              width={iconSize}
              style={styles.iconSkeleton}
            />

            {/* Text info */}
            <View style={styles.textInfo}>
              {/* Primary text (larger) */}
              <Skeleton height={16} width="70%" style={styles.primaryText} />

              {/* Secondary text (smaller) */}
              <Skeleton height={14} width="50%" style={styles.secondaryText} />
            </View>
          </View>

          {/* Right section: Value + Label */}
          <View style={styles.rightSection}>
            {/* Value text */}
            <Skeleton height={16} width={80} style={styles.valueText} />

            {/* Label/change text */}
            <Skeleton height={14} width={60} style={styles.labelText} />
          </View>
        </View>
      ))}
    </>
  );
};

export default PerpsRowSkeleton;
