import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

export interface TrendingTokensSkeletonProps {
  /**
   * Number of skeleton rows to render
   */
  count?: number;
  /**
   * Size of the icon skeleton (defaults to HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE)
   */
  iconSize?: number;
  /**
   * Optional style for the container
   */
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconSkeleton: {
    borderRadius: 100, // Fully circular
  },
  leftContainer: {
    paddingLeft: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  tokenHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenNameSkeleton: {
    marginBottom: 0,
  },
  marketStatsSkeleton: {
    marginTop: 2,
    marginBottom: 0,
  },
  rightContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  },
  priceSkeleton: {
    marginBottom: 0,
  },
  percentageSkeleton: {
    marginBottom: 0,
  },
});

const TrendingTokensSkeleton: React.FC<TrendingTokensSkeletonProps> = ({
  count = 1,
  iconSize = 44,
  style,
}) => {
  // Generate array for count
  const rows = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {rows.map((index) => (
        <View key={index} style={[styles.container, style]}>
          <View>
            <Skeleton
              height={iconSize}
              width={iconSize}
              style={styles.iconSkeleton}
            />
          </View>
          <View style={[styles.leftContainer, { minHeight: iconSize }]}>
            <View style={styles.tokenHeaderRow}>
              <Skeleton
                height={20}
                width="60%"
                style={styles.tokenNameSkeleton}
              />
            </View>
            <Skeleton
              height={18}
              width="80%"
              style={styles.marketStatsSkeleton}
            />
          </View>
          <View style={[styles.rightContainer, { minHeight: iconSize }]}>
            <Skeleton height={20} width={80} style={styles.priceSkeleton} />
            <Skeleton
              height={18}
              width={60}
              style={styles.percentageSkeleton}
            />
          </View>
        </View>
      ))}
    </>
  );
};

export default TrendingTokensSkeleton;
