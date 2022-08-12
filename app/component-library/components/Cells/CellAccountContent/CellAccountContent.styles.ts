// Third library dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { CellAccountContentStyleSheetVars } from './CellAccountContent.types';

// Internal dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for CellAccountContent component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellAccountContentStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    CellAccountContent: {
      flexDirection: 'row',
    },
    accountAvatar: {
      marginRight: 16,
    },
    CellAccountContentInfo: {
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
