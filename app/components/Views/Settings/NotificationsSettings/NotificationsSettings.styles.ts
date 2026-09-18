import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    container: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 48,
      backgroundColor: params.theme.colors.background.default,
    },
    contentContainer: {
      flexGrow: 1,
    },
    walletActivityList: {
      flex: 1,
      backgroundColor: params.theme.colors.background.default,
    },
    walletActivityListContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 48,
    },
    line: {
      borderTopWidth: 1,
      borderTopColor: params.theme.colors.border.muted,
      marginTop: 16,
      marginHorizontal: -16,
    },
    lineSpacer: {
      // Vertical stand-in for `line` where the divider is not drawn: same
      // footprint (16 top margin + 1 border) so the spacing is unchanged.
      height: 17,
    },
    heading: {
      marginTop: 16,
    },
    accessory: {
      marginTop: 16,
    },
    setting: {
      marginTop: 16,
    },
    disabledContent: {
      opacity: 0.5,
    },
    productAnnouncementContainer: {
      marginTop: 16,
    },
    walletActivityHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    selectAllButton: {
      marginLeft: 16,
    },
    accountsLoadError: {
      marginTop: 12,
    },
    marketingDisclaimer: {
      marginTop: 'auto',
      paddingTop: 16,
      paddingBottom: 48,
    },
    marketingDisclaimerText: {
      textAlign: 'center',
    },
    accountHeader: {
      marginTop: 16,
      marginLeft: -16,
    },
    accountCellContainer: {
      paddingHorizontal: 16,
    },
    clearHistoryConfirm: {
      marginTop: 18,
    },
    switchElement: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
    notificationRow: {
      // Every settings section row is at least as tall as the two-line rows
      // (title + status line), so a row without a status — wallet activity —
      // keeps the same height. switchElement centers children vertically.
      minHeight:
        params.theme.typography.sBodyMD.lineHeight +
        params.theme.typography.sBodySM.lineHeight,
    },
    switch: {
      alignSelf: 'flex-end',
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalText: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'center',
      color: params.theme.colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 20,
      color: params.theme.colors.text.default,
    },
    loader: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: params.theme.colors.background.default,
      flex: 1,
    },
    button: {
      alignSelf: 'stretch',
      marginBottom: 48,
    },
  });

export const styles = StyleSheet.create({
  headerLeft: {
    marginHorizontal: 16,
  },
});

export default styleSheet;
