import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
      gap: 8,
    },
    skeletonRounded: {
      borderRadius: 12,
    },
    errorDescription: {
      textAlign: 'center',
      paddingHorizontal: 46,
    },
    tryAgainButtonContainer: {
      paddingTop: 8,
    },
    skeleton: {
      width: 50,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
    },
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      flexGrow: 1,
    },
    defaultHorizontalPadding: {
      paddingHorizontal: 16,
    },
    cardBalanceContainer: {
      marginTop: 16,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      paddingVertical: 16,
    },
    balanceTextContainer: {
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
      width: '100%',
      marginBottom: 8,
    },
    cardImageContainer: {
      width: '100%',
      marginTop: 8,
    },
    cardAssetItemContainer: {
      height: 80,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    limitedAllowanceWarningContainer: {
      width: '100%',
    },
    limitedAllowanceManageCardText: {
      fontWeight: 'bold',
    },
    defaultMarginTop: {
      marginTop: 16,
    },
    buttonsContainerBase: {
      width: '100%',
    },
    buttonsContainer: {
      width: '100%',
      gap: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    halfWidthButton: {
      width: '50%',
    },
    spendingLimitContainer: {
      marginVertical: 8,
      width: '100%',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
  });

export default createStyles;
