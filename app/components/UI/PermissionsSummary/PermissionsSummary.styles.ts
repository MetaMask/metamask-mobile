import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (params: {
  theme: Theme;
  vars: { isRenderedAsBottomSheet: boolean | undefined };
}) => {
  const { theme } = params;
  const { vars } = params;

  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background.default,
    },
    mainContainer: {
      backgroundColor: theme.colors.background.default,
      paddingTop: 8,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      height: vars.isRenderedAsBottomSheet ? undefined : '100%',
      justifyContent: vars.isRenderedAsBottomSheet
        ? 'flex-start'
        : 'space-between',
    },
    title: {
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 16,
      marginRight: 24,
      marginLeft: 24,
    },
    bottomButtonsContainer: {
      marginTop: 8,
    },
    actionButtonsContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingHorizontal: 24,
      marginTop: 8,
    },
    buttonPositioning: {
      flex: 1,
    },
    cancelButton: {
      marginRight: 8,
    },
    confirmButton: {
      marginLeft: 8,
    },
    networkPermissionRequestInfoCard: {
      marginHorizontal: 24,
      marginTop: 8,
      marginBottom: 16,
      alignItems: 'center',
      flexDirection: 'row',
    },
    logoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainerNonDapp: {
      marginTop: 8,
    },
    domainLogoContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    assetLogoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    networkPermissionRequestDetails: {
      flex: 1,
      marginLeft: 12,
    },
    permissionRequestNetworkInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    permissionRequestAccountName: {
      maxWidth: '75%',
    },
    permissionRequestNetworkName: {
      marginRight: 4,
      maxWidth: '75%',
    },
    avatarGroup: {
      marginLeft: 2,
      minWidth: '25%',
      flexGrow: 1,
    },
    accountPermissionRequestInfoCard: {
      marginHorizontal: 24,
      marginTop: 8,
      marginBottom: 12,
      alignItems: 'center',
      flexDirection: 'row',
    },
    accountPermissionRequestDetails: {
      flex: 1,
      marginLeft: 12,
    },
    permissionRequestAccountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    startAccessory: { flex: 1, paddingLeft: 16 },
    endAccessory: {
      flex: 1,
      paddingRight: 16,
      alignItems: 'flex-end',
    },
    editArrow: {
      marginHorizontal: 16,
    },
    walletIcon: { alignSelf: 'flex-start' },
    dataIcon: { alignSelf: 'flex-start' },
    disconnectAllContainer: {
      marginHorizontal: 24,
      marginTop: 8,
      flexDirection: 'row',
    },
    disconnectButton: { flex: 1 },
    editTextContainer: {
      width: 56,
      alignItems: 'center',
    },
    nonDappNetworkSwitchButtons: {
      gap: 16,
    },
    description: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
  });
};

export default createStyles;
