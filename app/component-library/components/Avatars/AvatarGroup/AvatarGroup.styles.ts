// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { AvatarGroupStyleSheetVars } from './AvatarGroup.types';

/**
 * Style sheet function for AvatarGroup component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarGroupStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { stackWidth, stackHeight } = vars;
  const borderWidth = 1;
  const stackHeightWithBorder = stackHeight + borderWidth * 2;

  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      height: stackHeightWithBorder,
    },
    stack: {
      flexDirection: 'row',
      width: stackWidth + borderWidth * 2,
      height: stackHeightWithBorder,
    },
    stackedAvatarWrapper: {
      position: 'absolute',
      borderRadius: 50,
      borderWidth,
      borderColor: theme.colors.background.default,
    },
    overflowCounterWrapper: {
      justifyContent: 'center',
    },
    textStyle: {
      color: theme.colors.text.alternative,
      marginLeft: 2,
      bottom: 2,
    },
  });
};

export default styleSheet;
