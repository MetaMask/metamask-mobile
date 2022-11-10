// Third party dependencies.
import { StyleSheet, ImageStyle, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { TokenStyleSheetVars } from './Token.types';

/**
 * Style sheet function for Token component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: TokenStyleSheetVars }) => {
  const { vars } = params;
  const { style, size, isHaloEnabled } = vars;
  const imageSize = isHaloEnabled ? Number(size) * 0.64 : Number(size);
  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    haloImage: {
      opacity: 0.5,
    },
    halo: {
      width: Number(size),
      height: Number(size),
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      borderRadius: Number(size) / 2,
    },
    image: Object.assign({
      width: imageSize,
      height: imageSize,
      borderRadius: imageSize / 2,
    } as ImageStyle),
  });
};

export default styleSheet;
