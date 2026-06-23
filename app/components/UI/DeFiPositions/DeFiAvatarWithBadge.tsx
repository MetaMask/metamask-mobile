import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
} from '@metamask/design-system-react-native';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

interface DeFiAvatarWithBadgeProps {
  avatarName: string;
  avatarIconUrl: string;
  networkIconAvatar: ImageSourcePropType | undefined;
}

const toNetworkBadgeSrc = (
  source: ImageSourcePropType | undefined,
): ImageSourcePropType | undefined => {
  if (source === undefined) {
    return undefined;
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source;
};

const DeFiAvatarWithBadge: React.FC<DeFiAvatarWithBadgeProps> = ({
  avatarName,
  avatarIconUrl,
  networkIconAvatar,
}: DeFiAvatarWithBadgeProps) => (
  <BadgeWrapper
    position={BadgeWrapperPosition.BottomRight}
    positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
    badge={
      networkIconAvatar ? (
        <BadgeNetwork
          name={avatarName}
          src={toNetworkBadgeSrc(networkIconAvatar)}
        />
      ) : null
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
