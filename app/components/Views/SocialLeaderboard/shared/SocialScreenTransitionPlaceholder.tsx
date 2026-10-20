import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../util/theme';

const PLACEHOLDER_ROW_COUNT = 6;

interface SocialScreenTransitionPlaceholderProps {
  /** Accessible name for the busy region. The header keeps its own labels. */
  title: string;
  testID: string;
}

/**
 * Static stand-in for the pager while a native-stack push is in flight.
 * No shimmer, list, or query: those are what delay the transition.
 */
const SocialScreenTransitionPlaceholder: React.FC<
  SocialScreenTransitionPlaceholderProps
> = ({ title, testID }) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const barStyle = useMemo(
    () =>
      StyleSheet.create({
        bar: { backgroundColor: colors.background.section },
      }),
    [colors.background.section],
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityState={{ busy: true }}
      style={tw.style('flex-1 px-4 pt-2')}
    >
      {Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, index) => (
        <View
          key={index}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[tw.style('h-16 mb-3 rounded-xl'), barStyle.bar]}
        />
      ))}
    </View>
  );
};

export default SocialScreenTransitionPlaceholder;
