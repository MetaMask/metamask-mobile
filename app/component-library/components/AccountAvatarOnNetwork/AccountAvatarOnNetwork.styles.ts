import { StyleSheet } from 'react-native';

import { Theme } from 'app/util/theme/models';

import { BaseAvatarSize } from '../BaseAvatar';
import { AvatarBadgePosition } from './AccountAvatarOnNetwork.types';

const styleSheet = ({ vars, theme }: { vars: any; theme: Theme }) => {
  const { badgePosition } = vars;

  const badgeAbsolutePosition =
    badgePosition === AvatarBadgePosition.TopRight ? { top: 0 } : { bottom: 0 };

  const avatarWrapperPadding = 6;

  const size = BaseAvatarSize.Md;

  const avatarSize = Number(size);

  return StyleSheet.create({
    base: {
      width: avatarSize + avatarWrapperPadding,
      height: avatarSize + avatarWrapperPadding,
      justifyContent: 'center',
    },
    badge: {
      borderColor: theme.colors.background.default,
      borderWidth: 2,
      borderRadius: 8,
      width: 16,
      height: 16,
      right: 0,
      position: 'absolute',
      backgroundColor: theme.colors.background.default,
      ...badgeAbsolutePosition,
    },
  });
};

export default styleSheet;
