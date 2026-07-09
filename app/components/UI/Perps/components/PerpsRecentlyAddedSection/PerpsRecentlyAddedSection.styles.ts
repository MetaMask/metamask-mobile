import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
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
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeLabel: {
      flexShrink: 1,
    },
    priceRow: {
      gap: 2,
    },
  });
};

export default styleSheet;
