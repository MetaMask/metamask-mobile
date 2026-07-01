import { StyleSheet, type ViewStyle } from 'react-native';

export const breakdownLegendStyles = StyleSheet.create({
  skeletonLegend: {
    borderRadius: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
});

export function breakdownLegendColorDotStyle(
  color: string,
  dimmed: boolean,
): ViewStyle {
  return {
    ...breakdownLegendStyles.colorDot,
    backgroundColor: color,
    opacity: dimmed ? 0.3 : 1,
  };
}

export function breakdownLegendRowTwClass(
  pressed: boolean,
  isIneligible: boolean,
  isSelected: boolean,
): string {
  const base = 'w-full flex-row items-center justify-between py-3';
  if (isIneligible) {
    return `${base} opacity-40`;
  }
  if (pressed) {
    return `${base} opacity-70`;
  }
  if (isSelected) {
    return `${base} opacity-100`;
  }
  return base;
}
