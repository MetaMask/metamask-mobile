import { StyleSheet, Platform } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingTop: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flex: 1,
    },
    container: {
      marginTop: 16,
      backgroundColor: colors.background.default,
      borderRadius: 16,
      paddingTop: 8,
      alignSelf: 'stretch',
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
      gap: 12,
      marginTop: 8,
      paddingHorizontal: 16,
      marginBottom: Platform.OS === 'android' ? 16 : 0,
    },
    permissionRow: {
      alignSelf: 'stretch',
      width: '100%',
    },
    permissionLabel: {
      flexShrink: 1,
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    startAccessory: {
      flex: 1,
      paddingLeft: 16,
    },
    endAccessory: {
      flex: 1,
      paddingRight: 16,
      alignItems: 'flex-end',
    },
    editArrow: {
      marginHorizontal: 16,
    },
    disconnectAllContainer: {
      marginHorizontal: 16,
      marginVertical: 8,
      flexDirection: 'row',
    },
    disconnectButton: { flex: 1 },
    nonDappNetworkSwitchButtons: {
      gap: 16,
    },
    description: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
    // Tab Bar
    tabsContainer: {
      flex: 1,
    },
    // Header
    connectionTitle: {
      textAlign: 'center',
    },
    // Permissions Management
    permissionsManagementContainer: {
      marginTop: 8,
      alignSelf: 'stretch',
      backgroundColor: colors.background.default,
      borderRadius: 16,
      paddingVertical: 8,
    },
  });
};

export default createStyles;
