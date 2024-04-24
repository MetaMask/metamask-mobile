// Third party dependencies.
import { StyleSheet, TextStyle, ViewProps, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';
import { DisplayNameType } from '../../../../components/hooks/Names/useDisplayName';

/**
 * Style sheet function for TagUrl component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: { style: ViewProps['style']; displayNameType: DisplayNameType };
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style, displayNameType } = vars;

  const backgroundColor =
    displayNameType === DisplayNameType.SavedName
      ? colors.info.muted
      : colors.background.alternative;

  const textColor =
    displayNameType === DisplayNameType.SavedName
      ? colors.info.default
      : colors.text.default;

  const baseStyle: ViewStyle = {
    backgroundColor,
    borderRadius: 99,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 8,
    gap: 5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  };

  const labelStyle: TextStyle = {
    color: textColor,
    flexShrink: 1,
  };

  return StyleSheet.create({
    base: Object.assign(baseStyle, style),
    label: labelStyle,
  });
};

export default styleSheet;
