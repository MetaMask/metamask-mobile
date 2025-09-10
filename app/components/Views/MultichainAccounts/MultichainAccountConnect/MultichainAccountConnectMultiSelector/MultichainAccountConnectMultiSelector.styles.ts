// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../util/theme/models';
import Device from '../../../../../util/device';

/**
 * Style sheet function for MultichainAccountConnectMultiSelector screen.
 * @returns StyleSheet object.
 */

const styleSheet = (params: {
  theme: Theme;
  vars: { isRenderedAsBottomSheet: boolean | undefined };
}) => {
  const { colors } = params.theme;
  const { vars } = params;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      height: Device.isAndroid() || Device.isMediumDevice() ? '99%' : '100%',
    },
    body: {
      marginTop: 16,
      paddingHorizontal: 16,
    },
    description: {
      textAlign: 'center',
      marginVertical: 8,
      color: colors.text.alternative,
    },
    ctaButtonsContainer: {
      marginTop: 0,
      marginBottom: vars.isRenderedAsBottomSheet ? 0 : 16,
    },
    connectOrUpdateButtonContainer: {
      flexDirection: 'row',
      marginBottom: Device.isAndroid() ? 8 : 0,
    },
    button: {
      flex: 1,
    },
    newAccountButton: {
      paddingRight: 0,
    },
    buttonSeparator: {
      width: 16,
    },
    selectAllButton: {
      marginBottom: 16,
    },
    sdkInfoContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: -16,
    },
    sdkInfoDivier: {
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
      height: 1,
      width: '100%',
    },
    disabled: {
      opacity: 0.5,
    },
    addAccountButtonContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    selectAll: {
      marginLeft: 0,
      marginVertical: 12,
    },
    disconnectAllContainer: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    helpTextContainer: {
      margin: 16,
    },
    disconnectAllButtonContainer: {
      flexDirection: 'row',
    },
  });
};

export default styleSheet;
