import { StyleSheet, TextStyle, ViewStyle, ImageStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { DisplayNameVariant } from '../../hooks/DisplayName/useDisplayName';

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
  vars: { displayNameVariant: DisplayNameVariant };
}) => {
  const { theme } = params;
  const { colors } = theme;

  const textColor = colors.text.default;

  const baseStyle: ViewStyle = {
    borderRadius: 99,
    paddingVertical: 4,
    gap: 5,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  };

  const labelStyle: TextStyle = {
    color: textColor,
    flexShrink: 1,
  };

  const imageStyle: ImageStyle = {
    borderRadius: 8,
    height: 16,
    width: 16,
  };

  const labelContainerStyle: ViewStyle = {
    marginLeft: 4,
  };

  return StyleSheet.create({
    base: baseStyle,
    label: labelStyle,
    image: imageStyle,
    labelContainer: labelContainerStyle,
  });
};

export default styleSheet;
