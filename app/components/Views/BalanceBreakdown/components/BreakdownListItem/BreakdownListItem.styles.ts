import {
  StyleSheet,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';

export const breakdownListItemStyles = StyleSheet.create({
  progressTrack: {
    height: 4,
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
});

export function breakdownListItemProgressFillStyle(
  widthPercent: string,
  backgroundColor: string,
): ViewStyle {
  return {
    height: '100%',
    borderRadius: 9999,
    width: widthPercent as DimensionValue,
    backgroundColor,
  };
}
