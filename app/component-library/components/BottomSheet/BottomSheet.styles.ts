import { Theme } from 'app/util/theme/models';
import { StyleSheet, ViewStyle } from 'react-native';
import { BottomSheetStyleSheetVars } from './BottomSheet.types';

/**
 * Style sheet function for BottomSheet component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, maxSheetHeight } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay.default,
    },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: maxSheetHeight,
      overflow: 'hidden',
    },
    fill: {
      flex: 1,
    },
  });
};

export default styleSheet;
