// Third party dependencies.
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const screenHeight = Dimensions.get('window').height;
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const bgColor = '#ECEEFF';
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
    },
    modal: {
      backgroundColor: colors.background.default,
      borderRadius: 10,
      padding: 16,
      marginHorizontal: 16,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerEmpty: {
      width: 32,
      height: 32,
    },
    bodyContainer: { height: screenHeight / 2 },
    checkboxContainer: {
      flexDirection: 'row',
      marginTop: 16,
      columnGap: 8,
      marginRight: 16,
      width: '90%',
    },
    confirmButton: {
      marginTop: 16,
      width: '100%',
    },
    scrollToEndButton: {
      width: 40,
      height: 40,
      borderRadius: 40 / 2,
      backgroundColor: bgColor,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      position: 'absolute',
      bottom: 175,
      right: 32,
      boxShadow: `0px 3px 8px ${bgColor}`,
    },
    footerHelpText: {
      marginTop: 16,
      textAlign: 'center',
    },
  });
};

export default styleSheet;
