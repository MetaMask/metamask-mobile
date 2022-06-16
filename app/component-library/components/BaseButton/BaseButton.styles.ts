import { StyleSheet, ViewStyle } from 'react-native';
import {
  BaseButtonStyleSheet,
  BaseButtonStyleSheetVars,
} from './BaseButton.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for BaseButton component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BaseButtonStyleSheetVars;
}): BaseButtonStyleSheet => {
  const { vars, theme } = params;
  const { style, size } = vars;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        backgroundColor: theme.colors.background.alternative,
        height: sizeAsNum,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: sizeAsNum / 2,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    icon: {
      marginRight: 8,
    },
  });
};

export default styleSheet;
