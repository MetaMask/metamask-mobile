import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    description: {
      marginBottom: 16,
    },
    breakdownContainer: {
      gap: 12,
    },
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
    },
    emptyContainer: {
      paddingVertical: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerContainer: {
      paddingHorizontal: 16,
      zIndex: 0, // Ensure footer stays behind modal overlays
      elevation: 0, // Android equivalent
    },
    footerButtonSecondary: {
      flex: 1,
      borderWidth: 0,
    },
    labelWithTooltip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });
