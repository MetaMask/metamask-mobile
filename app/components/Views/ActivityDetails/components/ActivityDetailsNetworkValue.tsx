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
    <Box twClassName="flex-row items-center gap-2 shrink">
      {networkImage ? (
        <AvatarNetwork
          name={name}
          src={networkImage}
          size={AvatarNetworkSize.Sm}
        />
      ) : null}
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {name}
      </Text>
    </Box>
  );
}
