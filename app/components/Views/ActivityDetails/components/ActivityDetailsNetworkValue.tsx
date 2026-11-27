import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../util/networks';

export function ActivityDetailsNetworkValue({
  chainId,
  name,
}: {
  chainId: string;
  name: string;
}) {
  const networkImage = getNetworkImageSource({ chainId });

  return (
    <Box className="shrink flex-row items-center gap-1">
      {networkImage ? (
        <AvatarNetwork
          name={name}
          src={networkImage}
          size={AvatarNetworkSize.Sm}
        />
      ) : null}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        className="shrink"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
    </Box>
  );
}
