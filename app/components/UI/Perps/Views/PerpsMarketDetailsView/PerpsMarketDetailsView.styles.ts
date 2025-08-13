import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = ({
  theme,
  vars,
}: {
  theme: Theme;
  vars: { hasLongShortButtons: boolean };
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    innerContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: vars.hasLongShortButtons ? 75 : 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    assetInfo: {
      gap: 4,
    },
    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    assetName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    priceInfo: {
      alignItems: 'flex-end',
    },
    price: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    section: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    chartSection: {
      paddingTop: 0,
      marginTop: 16,
    },
    actionsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    longButton: {
      backgroundColor: theme.colors.success.default,
    },
    shortButton: {
      backgroundColor: theme.colors.error.default,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    positionWarning: {
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    positionWarningText: {
      textAlign: 'center',
    },
    addFundsContainer: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    riskDisclaimer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      textAlign: 'left',
    },
  });
