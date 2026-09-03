import React from 'react';
import { Image } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { getTokenImageSource } from '../../../utils';
import { TokenAvatarSelectorsIDs } from './testIds';
import type { TokenAvatarProps } from './types';

export const TokenAvatar = ({
  token,
  withNetworkBadge,
}: TokenAvatarProps) => {
  const tw = useTailwind();
  const tokenImageSource = getTokenImageSource(
    token.symbol,
    token.image,
    token.address,
    token.chainId,
  );
  const networkImageSource = getNetworkImageSource({ chainId: token.chainId });

  if (!withNetworkBadge) {
    return (
      <AvatarToken
        name={token.symbol}
        src={tokenImageSource}
        size={AvatarTokenSize.Xs}
      />
    );
  }

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      twClassName="mt-1"
      testID={TokenAvatarSelectorsIDs.NETWORK_BADGE}
      badge={
        <Box twClassName="overflow-hidden border-2 border-background-default bg-default rounded-[2px] w-[8px] h-[8px]">
          {networkImageSource ? (
            <Image
              source={networkImageSource}
              style={tw.style('h-full w-full')}
              testID={TokenAvatarSelectorsIDs.NETWORK_IMAGE}
            />
          ) : null}
        </Box>
      }
    >
      <AvatarToken
        name={token.symbol}
        src={tokenImageSource}
        size={AvatarTokenSize.Xs}
      />
    </BadgeWrapper>
  );
};
