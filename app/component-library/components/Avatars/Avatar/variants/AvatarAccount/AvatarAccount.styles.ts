// Third party dependencies.
import { ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarAccountStyleSheetVars } from './AvatarAccount.types';
import {
  BORDERRADIUS_BY_AVATARSIZE,
  DEFAULT_AVATARACCOUNT_SIZE,
} from './AvatarAccount.constants';

/**
 * Style sheet function for AvatarAccount component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarAccountStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, size = DEFAULT_AVATARACCOUNT_SIZE } = vars;
  const borderRadius = BORDERRADIUS_BY_AVATARSIZE[size];

  return {
    imageStyle: { flex: 1 },
    artStyle: { borderRadius },
    avatarBase: Object.assign(
      {
        borderRadius,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  };
};

export default styleSheet;
