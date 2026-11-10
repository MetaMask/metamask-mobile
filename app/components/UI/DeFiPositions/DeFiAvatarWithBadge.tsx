import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';

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
    position={BadgeWrapperPosition.BottomRight}
    badge={
      networkIconAvatar ? (
        <BadgeNetwork
          src={networkIconAvatar as ImageOrSvgSrc}
          twClassName="h-5 w-5 "
          imageOrSvgProps={{
            imageProps: { testID: 'network-avatar-image' },
          }}
        />
      ) : undefined
    }
  >
    <AvatarToken
      name={avatarName}
      src={{ uri: avatarIconUrl }}
      size={AvatarTokenSize.Lg}
      imageOrSvgProps={{
        imageProps: { testID: 'token-avatar-image' },
      }}
    />
  </BadgeWrapper>
);

export default DeFiAvatarWithBadge;
