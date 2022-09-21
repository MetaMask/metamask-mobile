// Third party dependencies.
import { Theme } from '../../../../util/theme/models';
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for AccountConnectMultiSelector screen.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    body: {
      paddingHorizontal: 16,
    },
    description: {
      textAlign: 'center',
      marginVertical: 16,
      color: colors.text.alternative,
    },
    ctaButtonsContainer: {
      marginTop: 24,
      flexDirection: 'row',
    },
    button: { flex: 1 },
    buttonSeparator: {
      width: 16,
    },
    selectAllButton: {
      marginBottom: 16,
    },
    disabled: {
      opacity: 0.5,
    },
  });
};

export default styleSheet;
