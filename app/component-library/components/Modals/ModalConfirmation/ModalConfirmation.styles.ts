// Third party dependencies.
import { StyleSheet } from 'react-native';
import { AppThemeKey, Theme } from '../../../../util/theme/models';
import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
} from '../../../../util/theme/themeUtils';

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
    screen: { justifyContent: 'center' },
    modal: {
      // Pure Black: use elevated surface color and add a subtle border
      backgroundColor: getElevatedSurfaceColor(theme),
      ...(isPureBlackEnabled && theme.themeAppearance === AppThemeKey.dark
        ? {
            borderWidth: 1,
            borderColor: colors.border.muted,
          }
        : null),
      borderRadius: 10,
      marginHorizontal: 16,
    },
    bodyContainer: {
      padding: 24,
    },
    headerLabel: {
      marginBottom: 8,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    button: {
      flex: 1,
    },
    buttonDivider: {
      width: 8,
    },
  });
};

export default styleSheet;
