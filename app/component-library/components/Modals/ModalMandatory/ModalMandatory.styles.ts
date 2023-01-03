// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { fontStyles } from '../../../../styles/common';
import Device from '../../../../util/device';
import { scale } from 'react-native-size-matters';

const screenHeight = Device.getDeviceHeight();
const maxItemHeight = screenHeight - 200;

/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay.default,
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
    },
    bodyContainer: {
      maxHeight: maxItemHeight,
      marginHorizontal: 16,
      marginTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginHorizontal: 16,
    },
    headerText: {
      ...fontStyles.bold,
      fontSize: scale(18),
      color: colors.text.default,
    },
    confirmButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    confirmButton: {
      width: '100%',
      marginTop: 16,
    },
    footerHelpText: { marginVertical: 16, fontSize: scale(12) },
  });
};

export default styleSheet;
