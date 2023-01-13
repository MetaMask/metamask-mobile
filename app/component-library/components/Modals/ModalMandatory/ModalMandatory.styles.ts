// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { fontStyles } from '../../../../styles/common';
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
    screen: {
      justifyContent: 'center',
      marginHorizontal: 16,
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    headerText: {
      ...fontStyles.bold,
      fontSize: scale(18),
      color: colors.text.default,
    },
    bodyContainer: {
      marginHorizontal: 16,
      marginTop: 16,
    },
    checkboxContainer: {
      flexDirection: 'row',
      marginTop: 16,
    },
    checkboxText: {
      ...fontStyles.bold,
      marginLeft: 8,
      fontSize: scale(14),
      flex: 1,
      textAlign: 'justify',
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
