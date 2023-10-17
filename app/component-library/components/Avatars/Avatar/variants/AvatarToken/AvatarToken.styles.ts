// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarTokenStyleSheetVars } from './AvatarToken.types';

/**
 * Style sheet function for AvatarToken component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars AvatarToken stylesheet vars.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarTokenStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { size, style, showFallback, isHaloEnabled } = vars;

  const avatarSizeWithHalo =
    isHaloEnabled && !showFallback
      ? {
          width: 20,
          height: 20,
          borderRadius: 20 / 2,
        }
      : {};

  const fallbackAvatarStyle = showFallback
    ? {
        backgroundColor: theme.colors.background.alternative,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: theme.colors.border.muted,
        borderWidth: 1,
      }
    : {};

  const baseStyle = {
    ...fallbackAvatarStyle,
    ...avatarSizeWithHalo,
  };

  const haloSize = Number(AvatarSize.Md);

  return StyleSheet.create({
    base: Object.assign(baseStyle, style) as ViewStyle,
    haloImage: {
      opacity: 0.5,
    },
    halo: {
      width: haloSize,
      height: haloSize,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      borderRadius: haloSize / 2,
    },
    label:
      // Temporarily lower font size in XS size to prevent cut off
      size === AvatarSize.Xs ? { lineHeight: undefined, fontSize: 10 } : {},
    image: {
      flex: 1,
      height: undefined,
      width: undefined,
    },
  });
};

export default styleSheet;
