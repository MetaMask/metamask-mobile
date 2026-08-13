import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';

/**
 * Shared wrapper that supplies the outer padding and the `SkeletonPlaceholder`
 * shimmer shell with theme-appropriate colours. Each specific skeleton only
 * needs to describe its inner shape.
 *
 * Lives here rather than beside any one screen's skeletons because the trader
 * profile, the trader position screen and the notification preferences all
 * build on it.
 */
export const SkeletonShell: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <View style={tw.style('px-4 py-3')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        {children}
      </SkeletonPlaceholder>
    </View>
  );
};

export default SkeletonShell;
