import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerBackButton: {
      marginRight: 12,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40, // Compensate for back button width to center title
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    headerSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
    assetLogoContainer: {
      marginBottom: 12,
    },
    assetName: {
      marginBottom: 4,
    },
    orderTypeLabel: {
      marginBottom: 8,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    detailsCard: {
      borderRadius: 8,
      padding: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    detailLabel: {
      flex: 1,
    },
    detailValue: {
      flex: 1,
      alignItems: 'flex-end',
    },
    separator: {
      height: 1,
      marginVertical: 4,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusFilled: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.success.muted,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
      backgroundColor: colors.background.default,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      gap: 8,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
  });
};

export default styleSheet;
