// Third party dependencies.
import { StyleSheet, ViewStyle, Dimensions } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for BottomSheetContent component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isFullscreen } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: Dimensions.get('window').width,
        height: isFullscreen ? Dimensions.get('window').height : 'auto',
        backgroundColor: colors.background.default,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;
