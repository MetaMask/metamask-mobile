import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    pnlSection: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    pnlCard: {
      flex: 1,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    pnlCardLeft: {
      // Left card styling if different
    },
    pnlCardRight: {
      // Right card styling if different
    },
    sizeMarginRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    sizeContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
    },
    sizeLeftContent: {
      flex: 1,
      gap: 4,
    },
    marginContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
    },
    marginLeftContent: {
      flex: 1,
      gap: 4,
    },
    autoCloseSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    autoCloseTextContainer: {
      flex: 1,
      gap: 4,
    },
    toggleContainer: {
      marginLeft: 16,
    },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background.alternative,
      padding: 2,
      justifyContent: 'center',
    },
    toggleEnabled: {
      backgroundColor: colors.primary.default,
    },
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.background.default,
      shadowColor: colors.shadow.default,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    toggleThumbEnabled: {
      alignSelf: 'flex-end',
    },
    detailsSection: {
      gap: 12,
    },
    detailsTitle: {
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
