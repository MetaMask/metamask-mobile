import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { CellContainerMultiSelectItemStyleSheetVars } from './CellContainerMultiSelectItem.types';

/**
 * Style sheet function for CellContainerMultiSelectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellContainerMultiSelectItemStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    base: Object.assign(
      {
        position: 'relative',
        padding: 16,
        borderRadius: 4,
        backgroundColor: colors.background.default,
        zIndex: 100,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    selectedView: {
      position: 'absolute',
      flexDirection: 'row',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.primary.muted,
      zIndex: 200,
    },
    checkbox: {
      marginRight: 10,
    },
    contentContainer: {
      zIndex: 300,
      flexDirection: 'row',
    },
    childrenContainer: {
      flex: 1,
    },
  });
};

export default styleSheet;
