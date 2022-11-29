// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import { ButtonBaseStyleSheetVars } from './ButtonBase.types';

/**
 * Style sheet function for ButtonBase component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonBaseStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, size, labelColor } = vars;
  const isAutoSize: boolean = size === ButtonSize.Auto;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        backgroundColor: theme.colors.background.alternative,
        height: isAutoSize ? size : Number(size),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: isAutoSize ? 0 : Number(size) / 2,
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
