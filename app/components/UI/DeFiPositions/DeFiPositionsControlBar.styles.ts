import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const {
    theme: { colors },
  } = params;
  return StyleSheet.create({
    actionBarWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      marginRight: 4,
      maxWidth: '60%',
      paddingHorizontal: 0,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      marginRight: 4,
      maxWidth: '60%',
      paddingHorizontal: 0,
      opacity: 0.5,
    },
    controlButtonText: {
      color: colors.text.default,
    },
    controlIconButton: {
      backgroundColor: colors.background.default,
    },
  });
};

export default styleSheet;
