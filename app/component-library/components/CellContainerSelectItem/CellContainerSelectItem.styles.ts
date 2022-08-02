import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { CellContainerSelectItemStyleSheetVars } from './CellContainerSelectItem.types';

/**
 * Style sheet function for CellContainerSelectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellContainerSelectItemStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
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
    verticalBar: {
      marginVertical: 4,
      marginLeft: 4,
      width: 4,
      borderRadius: 2,
      backgroundColor: colors.primary.default,
    },
    contentContainer: {
      zIndex: 300,
    },
  });
};

export default styleSheet;
