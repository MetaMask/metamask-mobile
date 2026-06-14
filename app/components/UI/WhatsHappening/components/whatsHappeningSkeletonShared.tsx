import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';

type Tw = ReturnType<typeof useTailwind>;

/**
 * Single place for What's Happening skeleton shimmer colors (carousel card +
 * detail expanded card).
 */
export const WhatsHappeningSkeletonShimmer: React.FC<{
  children: React.ReactElement;
}> = ({ children }) => {
  const { colors } = useTheme();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      {children}
    </SkeletonPlaceholder>
  );
};

/**
 * Vertical stack of empty placeholder bars
 */
export const WhatsHappeningSkeletonLineStack: React.FC<{
  tw: Tw;
  /** Container gap utility, e.g. `gap-1` or `gap-1.5` */
  gapClass: string;
  /** One tw utility string per line (width + height + radius) */
  lineClassNames: readonly string[];
}> = ({ tw, gapClass, lineClassNames }) => (
  <View style={tw.style(gapClass)}>
    {lineClassNames.map((lineClass, index) => (
      <View key={`sk-line-${index}`} style={tw.style(lineClass)} />
    ))}
  </View>
);
