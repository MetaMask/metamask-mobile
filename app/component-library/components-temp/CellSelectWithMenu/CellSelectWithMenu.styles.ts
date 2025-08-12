// Third library dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { CellSelectWithMenuStyleSheetVars } from './CellSelectWithMenu.types';

// Internal dependencies.
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for CellSelect component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellSelectWithMenuStyleSheetVars;
}) => {
  const { vars } = params;
  const { style } = vars;
  const { colors } = params.theme;

  return StyleSheet.create({
    base: Object.assign(
      {
        padding: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    cellBase: Object.assign(
      {
        flexDirection: 'row',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    avatar: {
      marginRight: 16,
    },
    cellBaseInfo: {
      flex: 1,
      alignItems: 'flex-start',
    },
    cellMultiSelectBaseInfo: {
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
    selectedTag: {
      backgroundColor: colors.primary.muted,
    },
    containerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 0,
      zIndex: 1,
    },
    arrowStyle: {
      paddingLeft: 8,
      paddingTop: 24,
    },
  });
};

export default styleSheet;
