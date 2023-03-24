// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for SheetBottom component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    base: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary.default,
      borderRadius: 16,
      height: 32,
      width: 32,
      marginHorizontal: 16,
    },
    descriptionLabel: {
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
