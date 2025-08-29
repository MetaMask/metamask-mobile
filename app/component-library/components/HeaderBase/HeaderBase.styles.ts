// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import {
  HeaderBaseStyleSheetVars,
  HeaderBaseVariant,
} from './HeaderBase.types';

/**
 * Style sheet function for HeaderBase component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: HeaderBaseStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, startAccessorySize, endAccessorySize, variant } = vars;

  const isLeftAligned = variant === HeaderBaseVariant.Display;

  // Only calculate accessoryWidth for center alignment to ensure visual centering
  let accessoryWidth;
  if (!isLeftAligned && startAccessorySize && endAccessorySize) {
    accessoryWidth = Math.max(startAccessorySize.width, endAccessorySize.width);
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.background.default,
        flexDirection: 'row',
        gap: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    titleWrapper: {
      flex: 1,
      alignItems: isLeftAligned ? 'flex-start' : 'center',
    },
    title: {
      textAlign: isLeftAligned ? 'left' : 'center',
    },
    accessoryWrapper: {
      width: accessoryWidth,
    },
  });
};

export default styleSheet;
