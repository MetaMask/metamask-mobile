import React from 'react';
import type { ViewStyle } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
} from '@metamask/design-system-react-native';
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
  const rows = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {rows.map((index) => (
        <Box
          key={index}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          paddingVertical={3}
          paddingHorizontal={4}
          style={style}
        >
          {/* Left section: Icon + Info */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            {/* Circular icon skeleton */}
            <Skeleton
              height={iconSize}
              width={iconSize}
              twClassName="rounded-full mr-3"
            />

            {/* Text info */}
            <Box twClassName="flex-1 gap-1.5">
              {/* Primary text (larger) */}
              <Skeleton height={16} width="70%" />

              {/* Secondary text (smaller) */}
              <Skeleton height={14} width="50%" />
            </Box>
          </Box>

          {/* Right section: Value + Label */}
          <Box alignItems={BoxAlignItems.End} twClassName="gap-1.5">
            {/* Value text */}
            <Skeleton height={16} width={80} />

            {/* Label/change text */}
            <Skeleton height={14} width={60} />
          </Box>
        </Box>
      ))}
    </>
  );
};

export default PerpsRowSkeleton;
