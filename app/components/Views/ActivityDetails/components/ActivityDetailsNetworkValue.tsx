import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="shrink"
    >
      {networkImage ? (
        <AvatarNetwork
          name={name}
          src={networkImage}
          size={AvatarNetworkSize.Xs}
        />
      ) : null}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="shrink"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
    </Box>
  );
}
