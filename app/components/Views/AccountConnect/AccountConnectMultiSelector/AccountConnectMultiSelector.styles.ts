// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { isMultichainVersion1Enabled } from '../../../../util/networks';

/**
 * Style sheet function for AccountConnectMultiSelector screen.
 * @returns StyleSheet object.
 */

const styleSheet = (params: {
  theme: Theme;
  vars: { isRenderedAsBottomSheet: boolean | undefined };
}) => {
  const { colors } = params.theme;
  const { vars } = params;
  return StyleSheet.create({
    container: {
      height: '100%',
    },
    body: {
      paddingHorizontal: 16,
    },
    description: {
      textAlign: 'center',
      marginVertical: isMultichainVersion1Enabled ? 8 : 16,
      color: colors.text.alternative,
    },
    ctaButtonsContainer: {
      marginTop: isMultichainVersion1Enabled ? 0 : 24,
      marginBottom: vars.isRenderedAsBottomSheet ? 0 : 16,
    },
    connectOrUpdateButtonContainer: { flexDirection: 'row' },
    button: { flex: 1 },
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
      marginTop: 16,
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
