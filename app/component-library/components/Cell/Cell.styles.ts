import { StyleSheet, ViewStyle } from 'react-native';
import { CellStyleSheetVars } from './Cell.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for CellAccount component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: CellStyleSheetVars }) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    cell: {
      flexDirection: 'row',
    },
    accountAvatar: {
      marginRight: 16,
    },
    cellInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    optionalAccessory: {
      marginLeft: 16,
    },
    secondaryText: {
      color: colors.text.alternative,
    },
    tertiaryText: {
      color: colors.text.alternative,
    },
    tagLabel: {
      marginTop: 4,
    },
  });
};

export default styleSheet;
