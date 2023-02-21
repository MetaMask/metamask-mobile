// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

/**
 * Style sheet function for ButtonBase component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars, theme } = params;
  const { style, size, labelColor, width } = vars;
  const isAutoSize: boolean = size === ButtonSize.Auto;
  let widthObject;
  switch (width) {
    case ButtonWidthTypes.Auto:
      widthObject = { alignSelf: 'flex-start' };
      break;
    case ButtonWidthTypes.Full:
      widthObject = { alignSelf: 'stretch' };
      break;
    default:
      widthObject = { width };
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        backgroundColor: theme.colors.background.alternative,
        height: isAutoSize ? size : Number(size),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: isAutoSize ? 0 : Number(size) / 2,
        paddingHorizontal: isAutoSize ? 0 : 16,
        ...widthObject,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    icon: {
      marginRight: 8,
    },
    label: {
      color: labelColor,
    },
  });
};

export default styleSheet;
