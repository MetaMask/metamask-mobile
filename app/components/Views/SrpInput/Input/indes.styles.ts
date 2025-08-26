// Third party dependencies.
import { StyleProp, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { colors } from '../../../../styles/common';
import { getFontFamily } from '../../../../component-library/components/Texts/Text/';

// Internal dependencies
import { InputStyleSheetVars } from '../../../../component-library/components/Form/TextField/foundation/Input/Input.types';

/**
 * Style sheet function for Input component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: InputStyleSheetVars & { inputStyle?: StyleProp<ViewStyle> };
}) => {
  const { theme, vars } = params;
  const {
    style,
    textVariant,
    isDisabled,
    isStateStylesDisabled,
    isFocused,
    inputStyle,
  } = vars;
  const stateObj = isStateStylesDisabled
    ? {
        opacity: 1,
      }
    : {
        opacity: isDisabled ? 0.5 : 1,
        borderColor: isFocused
          ? theme.colors.primary.default
          : colors.transparent,
      };
  return StyleSheet.create({
    base: Object.assign(
      {
        color: theme.colors.text.default,
        borderWidth: 1,
        borderColor: colors.transparent,
        backgroundColor: theme.colors.background.default,
        height: 24,
        ...stateObj,
        paddingVertical: 0,
        fontFamily: getFontFamily(textVariant),
        fontWeight: theme.typography[textVariant].fontWeight,
        fontSize: theme.typography[textVariant].fontSize,
        letterSpacing: theme.typography[textVariant].letterSpacing,
      },
      StyleSheet.flatten(inputStyle),
      style,
    ) as TextStyle,
  });
};

export default styleSheet;
