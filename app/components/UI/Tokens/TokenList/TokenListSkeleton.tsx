import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../../util/theme';
import createStyles from '../styles';

const TokenListSkeleton = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapperSkeleton}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <View key={index} style={styles.skeletonItem}>
            {/* Token icon skeleton */}
            <SkeletonPlaceholder.Item
              width={40}
              height={40}
              borderRadius={20}
              marginRight={12}
            />

            {/* Token name and symbol skeleton */}
            <View style={styles.skeletonTextContainer}>
              <SkeletonPlaceholder.Item
                width={120}
                height={16}
                borderRadius={4}
                marginBottom={4}
              />
              <SkeletonPlaceholder.Item
                width={80}
                height={12}
                borderRadius={4}
              />
            </View>

            {/* Token value and percentage skeleton */}
            <View style={styles.skeletonValueContainer}>
              <SkeletonPlaceholder.Item
                width={60}
                height={16}
                borderRadius={4}
                marginBottom={4}
              />
              <SkeletonPlaceholder.Item
                width={50}
                height={12}
                borderRadius={4}
              />
            </View>
          </View>
        ))}
      </SkeletonPlaceholder>
    </View>
  );
};

export default TokenListSkeleton;
