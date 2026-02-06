import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected: boolean };
}) => {
  const {
    theme,
    vars: { isSelected },
  } = params;

  // Use same base styling as PerpsMarketSortDropdowns for visual consistency
  // Selected state: inverse overlay background for high contrast distinction
  // Unselected state: muted background (same as Volume dropdown)
  return StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isSelected
        ? theme.colors.overlay.inverse
        : theme.colors.background.muted,
      gap: 4,
    },
    badgePressed: {
      opacity: 0.7,
    },
    badgeText: {
      color: isSelected ? theme.colors.icon.inverse : theme.colors.text.default,
    },
  });
};
