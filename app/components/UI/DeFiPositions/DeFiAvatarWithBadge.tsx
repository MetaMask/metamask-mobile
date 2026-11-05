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
import { getProtocolAvatarSrc } from './get-protocol-avatar-src';

interface DeFiAvatarWithBadgeProps {
  avatarName: string;
  avatarIconUrl: string;
  /**
   * DeFi protocol id. When set, known protocols (e.g. MetaMask staking) render
   * a bundled logo instead of `avatarIconUrl`.
   */
  protocolId?: string;
  networkIconAvatar: ImageSourcePropType | undefined;
}

const DeFiAvatarWithBadge: React.FC<DeFiAvatarWithBadgeProps> = ({
  avatarName,
  avatarIconUrl,
  protocolId,
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
      src={getProtocolAvatarSrc(avatarIconUrl, protocolId)}
      size={AvatarTokenSize.Lg}
      imageOrSvgProps={{
        imageProps: { testID: 'token-avatar-image' },
      }}
    />
  </BadgeWrapper>
);

export default DeFiAvatarWithBadge;
