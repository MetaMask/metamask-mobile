// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarImageStyleSheetVars } from './AvatarImage.types';

/**
 * Style sheet function for AvatarImage component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarImageStyleSheetVars;
}) => {
  const { vars } = params;
  const { size, isHaloEnabled } = vars;
  const imageSize = isHaloEnabled ? Number(size) * 0.64 : Number(size);
  return StyleSheet.create({
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
