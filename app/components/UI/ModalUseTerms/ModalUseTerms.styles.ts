// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import { scale } from 'react-native-size-matters';

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
    termsAndConditionsContainer: { marginRight: 16 },
    acceptTermsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
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

    checkBox: { flex: 1, elevation: 10 },
    checkBoxText: {
      ...fontStyles.bold,
      flex: 1,
      marginLeft: 8,
      fontSize: scale(14),
    },
    confirmButton: {
      width: '100%',
      marginTop: 16,
    },
    scrollDownInfo: { marginVertical: 16 },
  });
};

export default styleSheet;
