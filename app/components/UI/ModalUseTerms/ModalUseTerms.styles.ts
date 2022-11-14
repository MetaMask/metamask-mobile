// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

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
      marginHorizontal: 32,
    },
    bodyContainer: {
      maxHeight: maxItemHeight,
    },
    termsAndConditionsContainer: { marginLeft: 16, marginRight: 32 },
    acceptTermsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
      fontSize: 18,
      color: colors.text.default,
    },
    scrollToEndButton: {
      width: 32,
      height: 32,
      borderRadius: 32 / 2,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      position: 'absolute',
      bottom: 100,
      right: 32,
      borderWidth: 1,
      borderColor: colors.primary.default,
    },
    confirmButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    checkBox: { flex: 1, elevation: 10 },
    checkBoxText: {
      ...fontStyles.bold,
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
    },
    confirmButton: {
      width: '100%',
      marginTop: 16,
    },
    scrollDownInfo: { marginVertical: 16 },
  });
};

export default styleSheet;
