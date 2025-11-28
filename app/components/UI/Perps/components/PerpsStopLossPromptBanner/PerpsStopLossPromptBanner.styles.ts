import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    // Add Margin Variant Layout
    addMarginRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    addMarginTextContainer: {
      flex: 1,
      gap: 2,
    },
    // Stop Loss Variant Layout
    stopLossRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stopLossTextContainer: {
      flex: 1,
      gap: 2,
    },
    // Button styles
    button: {
      minWidth: 60,
    },
    // Toggle wrapper
    toggleContainer: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Distance highlight
    distanceHighlight: {
      fontWeight: '700',
    },
  });
};

export default styleSheet;
