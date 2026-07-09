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
    },
    logoRow: {
      marginBottom: 12,
    },
    name: {
      marginBottom: 4,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timeLabel: {
      flexShrink: 1,
      marginTop: 10,
    },
  });
};

export default styleSheet;
