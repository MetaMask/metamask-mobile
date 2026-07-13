import { StyleSheet, type ViewStyle } from 'react-native';

export const breakdownHeroValueStyles = StyleSheet.create({
  fadeBand: {
    alignItems: 'center',
  },
  skeletonValue: {
    borderRadius: 6,
  },
  /** Bounded hero amount: full width of parent so adjustsFontSizeToFit can shrink. */
  valueAmountFit: {
    width: '100%',
    textAlign: 'center' as const,
  },
  skeletonDelta: {
    borderRadius: 4,
  },
});

export function breakdownHeroValueSkeletonBoundedStyle(
  maxWidth: number,
): ViewStyle {
  return {
    width: maxWidth,
    alignSelf: 'center',
  };
}
