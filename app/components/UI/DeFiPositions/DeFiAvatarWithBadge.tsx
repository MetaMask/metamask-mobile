import React from 'react';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { ImageSourcePropType } from 'react-native';

interface DeFiAvatarWithBadgeProps {
  avatarName: string;
  avatarIconUrl: string;
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiAvatarWithBadge: React.FC<DeFiAvatarWithBadgeProps> = ({
  avatarName,
  avatarIconUrl,
  networkIconAvatar,
}: DeFiAvatarWithBadgeProps) => (
  <BadgeWrapper
    badgePosition={BadgePosition.BottomRight}
    badgeElement={
      <Badge variant={BadgeVariant.Network} imageSource={networkIconAvatar} />
    }
  >
    <AvatarToken
      name={avatarName}
      imageSource={{ uri: avatarIconUrl }}
      size={AvatarSize.Lg}
    />
  </BadgeWrapper>
);

export default DeFiAvatarWithBadge;
