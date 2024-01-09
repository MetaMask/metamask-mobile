// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { BaseListItemMultiSelectStyleSheetVars } from './BaseListItemMultiSelect.types';

/**
 * Style sheet function for BaseListItemMultiSelect component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BaseListItemMultiSelectStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, gap, isDisabled } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        padding: 16,
        borderRadius: 4,
        alignItems: 'flex-start',
        backgroundColor: colors.background.default,
        opacity: isDisabled ? 0.5 : 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    listItem: {
      padding: 0,
    },
    underlay: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      backgroundColor: colors.primary.muted,
    },
    checkbox: {
      marginRight: 8 - Number(gap),
    },
  });
};

export default styleSheet;
