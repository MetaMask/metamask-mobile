// Third party dependencies.
import { StyleSheet, TextStyle, Dimensions } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
/**
 * Style sheet function for AccountConnectSingle screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, typography } = theme;
  return StyleSheet.create({
    // Safe Area
    safeArea: {
      backgroundColor: theme.colors.background.default,
    },
    mainContainer: {
      backgroundColor: theme.colors.background.default,
      paddingTop: 16,
      height: SCREEN_HEIGHT / 2,
      justifyContent: 'flex-start',
      paddingHorizontal: 24,
    },
    // Header
    header: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    startAccessory: {
      flex: 1,
      paddingLeft: 16,
    },
    logoContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainerNonDapp: {
      marginTop: 8,
    },
    // Top Logo Icon
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
    headerTitleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    headerDescription: {},
    // Tab
    base: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    tabStyle: {
      paddingVertical: 16,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabUnderlineStyleInactive: {
      backgroundColor: colors.text.muted,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMD),
    },
    tabBar: {
      borderColor: colors.background.default,
      marginBottom: 8,
    },
    // Action Buttons
    actionButtonsContainer: {
      flex: 0,
      flexDirection: 'row',
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
    // Edit Accounts
    editAccountsContainer: {
      marginTop: 8,
    },
  });
};

export default styleSheet;
