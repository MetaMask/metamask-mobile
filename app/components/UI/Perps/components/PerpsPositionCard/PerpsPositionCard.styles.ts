import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    pnlSection: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    pnlCard: {
      flex: 1,
      backgroundColor: colors.background.section,
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
      gap: 8,
      marginBottom: 8,
    },
    sizeContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
    },
    sizeLeftContent: {
      flex: 1,
      gap: 4,
    },
    sizeLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    marginContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
    },
    marginLeftContent: {
      flex: 1,
      gap: 4,
    },
    marginLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    autoCloseSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    autoCloseTextContainer: {
      flex: 1,
      gap: 4,
    },
    autoCloseButton: {
      borderRadius: 8,
    },
    iconButton: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
    },
    iconButtonContainer: {
      height: '100%',
      alignItems: 'flex-end',
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
      gap: 1,
      marginTop: 20,
    },
    detailsTitle: {
      marginBottom: 16,
    },
    detailRow: {
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.section,
    },
    detailRowFirst: {
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    detailRowLast: {
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    liquidationPriceValue: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
