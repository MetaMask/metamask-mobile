// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies
import { TextFieldStyleSheetVars } from './TextField.types';

const BORDER_WIDTH = 1;
const FIELD_HEIGHT = 48;
const FIELD_BORDER_RADIUS = 10;

// iOS system palette equivalents (UIKit systemGray4/systemGray6/tint).
// Intentionally not design tokens: these match Apple's fixed system colors,
// not this app's brand palette.
/* eslint-disable @metamask/design-tokens/color-no-hex */
const IOS_OUTLINE_LIGHT = '#C7C7CC';
const IOS_OUTLINE_DARK = '#3A3A3C';
const IOS_FILL_LIGHT = '#F2F2F7';
const IOS_FILL_DARK = '#1C1C1E';
const IOS_TINT_LIGHT = '#007AFF';
const IOS_TINT_DARK = '#0A84FF';
/* eslint-enable @metamask/design-tokens/color-no-hex */

/**
 * Style sheet function for TextField component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TextFieldStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, isError, isDisabled, isFocused } = vars;
  const isDark = theme.themeAppearance === 'dark';
  let borderColor = isDark ? IOS_OUTLINE_DARK : IOS_OUTLINE_LIGHT;
  if (isFocused) {
    borderColor = isDark ? IOS_TINT_DARK : IOS_TINT_LIGHT;
  }
  if (isError) {
    borderColor = theme.colors.error.default;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: FIELD_BORDER_RADIUS,
        height: FIELD_HEIGHT,
        borderWidth: BORDER_WIDTH,
        borderColor,
        paddingHorizontal: 16,
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor: isDark ? IOS_FILL_DARK : IOS_FILL_LIGHT,
      },
      StyleSheet.flatten(style),
    ) as ViewStyle,
    startAccessory: {
      marginRight: 12,
    },
    inputContainer: {
      flex: 1,
    },
    // This is needed to override the background color of the input and inherit configurable parent background color
    // eslint-disable-next-line react-native/no-color-literals
    input: {
      backgroundColor: 'inherit',
      // subtract border width from height so it won't overflow the container
      height: FIELD_HEIGHT - BORDER_WIDTH * 2,
    },
    endAccessory: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;
