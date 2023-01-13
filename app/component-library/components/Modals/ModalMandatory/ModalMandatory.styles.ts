// Third party dependencies.
import { StyleSheet, TextStyle, Dimensions } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const screenHeight = Dimensions.get('window').height;

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
  const { colors, typography } = theme;

  return StyleSheet.create({
    screen: {
      justifyContent: 'center',
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      padding: 16,
      marginHorizontal: 16,
    },
    headerText: {
      color: colors.text.default,
      ...(typography.sHeadingMD as TextStyle),
      textAlign: 'center',
      marginBottom: 16,
    },
    webView: { height: screenHeight / 2 },
    checkboxContainer: {
      flexDirection: 'row',
      marginTop: 16,
    },
    checkboxText: {
      marginLeft: 8,
      flex: 1,
      color: colors.text.default,
      ...(typography.sBodyMDBold as TextStyle),
    },
    confirmButton: {
      marginTop: 16,
    },
    footerHelpText: {
      marginTop: 16,
      marginBottom: 4,
      textAlign: 'center',
      color: colors.text.alternative,
      ...(typography.sBodySM as TextStyle),
    },
  });
};

export default styleSheet;
