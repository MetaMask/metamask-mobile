import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    rail: {
      paddingBottom: 4,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 4,
      gap: 12,
    },
    tile: {
      width: 128,
      borderRadius: 12,
      backgroundColor: colors.background.muted,
      padding: 12,
      gap: 8,
    },
    symbolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    priceLabel: {
      flexShrink: 1,
    },
  });
};

export default styleSheet;
