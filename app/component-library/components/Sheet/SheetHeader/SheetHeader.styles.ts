// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { AppThemeKey, Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for SheetHeader component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors, themeAppearance } = theme;
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: 16,
      backgroundColor:
        themeAppearance === AppThemeKey.dark
          ? colors.background.section
          : colors.background.default,
      height: 32,
    },
    leftAccessory: {
      flex: 1,
    },
    rightAccessory: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });
};

export default styleSheet;
