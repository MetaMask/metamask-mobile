import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import { useStyles } from '../../../../../../../component-library/hooks';
import type { PerpsMarketRowSkeletonProps } from './PerpsMarketRowSkeleton.types';
import styleSheet from './PerpsMarketRowSkeleton.styles';

/**
 * PerpsMarketRowSkeleton Component
 *
 * Loading skeleton component for Perps market list rows
 * Displays placeholder content while market data is loading
 *
 * Features:
 * - Avatar skeleton (40x40 circle)
 * - Token symbol and leverage skeletons
 * - Volume skeleton
 * - Price and change skeletons
 * - Matches the layout of actual market rows
 *
 * @example
 * ```tsx
 * {Array.from({ length: 8 }).map((_, index) => (
 *   <PerpsMarketRowSkeleton key={index} />
 * ))}
 * ```
 */
const PerpsMarketRowSkeleton: React.FC<PerpsMarketRowSkeletonProps> = ({
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.skeletonContainer} testID={testID}>
      <View style={styles.skeletonLeftSection}>
        {/* Avatar skeleton */}
        <Skeleton width={40} height={40} style={styles.skeletonAvatar} />
        <View style={styles.skeletonTokenInfo}>
          <View style={styles.skeletonTokenHeader}>
            {/* Token symbol skeleton */}
            <Skeleton
              width={60}
              height={16}
              style={styles.skeletonTokenSymbol}
            />
            {/* Leverage skeleton */}
            <Skeleton width={30} height={14} style={styles.skeletonLeverage} />
          </View>
          {/* Volume skeleton */}
          <Skeleton width={80} height={12} style={styles.skeletonVolume} />
        </View>
      </View>
      <View style={styles.skeletonRightSection}>
        {/* Price skeleton */}
        <Skeleton width={90} height={16} style={styles.skeletonPrice} />
        {/* Change skeleton */}
        <Skeleton width={70} height={14} style={styles.skeletonChange} />
      </View>
    </View>
  );
};

export default PerpsMarketRowSkeleton;
