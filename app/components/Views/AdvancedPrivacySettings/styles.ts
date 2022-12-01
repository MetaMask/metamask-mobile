// Third party dependencies.

import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    scrollViewContainer: { marginHorizontal: 16, marginVertical: 8 },
    thirdPartyText: { textAlign: 'center' },
    customEthTitle: { marginTop: 16 },
    /*   selectInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderWidth: 2,
      borderRadius: 5,
      borderColor: colors.border.default,
      padding: 10,
      color: colors.text.default,
      marginVertical: 16,
    }, */
    addCustomNetwork: { flex: 1, marginVertical: 16 },
    label: {
      marginHorizontal: 8,
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      borderColor: colors.border.default,
      padding: 10,
      color: colors.text.default,
      marginTop: 16,
    },
    validUrlText: { color: colors.error.default },
  });
};

export default styleSheet;
