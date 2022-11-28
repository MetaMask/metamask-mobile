// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

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
    transactionHeader: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    domainUrlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: 222,
      height: 44,
      borderWidth: 1,
      borderRadius: 222 / 2,
      borderColor: colors.border.default,
      marginHorizontal: 77,
      marginBottom: 24,
    },
    iconContainer: {
      marginRight: 8,
    },
    domainUrl: {
      ...fontStyles.bold,
      textAlign: 'center',
      fontSize: 14,
      color: colors.text.default,
    },
  });
};

export default styleSheet;
