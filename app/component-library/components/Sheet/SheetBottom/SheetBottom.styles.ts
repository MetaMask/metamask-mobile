// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { SheetBottomStyleSheetVars } from './SheetBottom.types';

/**
 * Style sheet function for SheetBottom component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SheetBottomStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { maxSheetHeight, screenBottomPadding } = vars;
  return StyleSheet.create({
    base: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
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
      paddingBottom: screenBottomPadding,
    },
    fill: {
      flex: 1,
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
      alignSelf: 'center',
      marginTop: 4,
    },
  });
};

export default styleSheet;
