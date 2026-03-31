import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import type { MockAsset } from './types';
import AssetLabel from './AssetLabel';

const AccountAssetRow = ({ asset }: { asset: MockAsset }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-4"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 gap-4"
    >
      {asset.kind === 'network' ? (
        <AvatarNetwork
          name={asset.title}
          src={asset.iconSource}
          size={AvatarNetworkSize.Lg}
        />
      ) : (
        <AvatarToken
          name={asset.title}
          src={asset.iconSource}
          size={AvatarTokenSize.Lg}
        />
      )}
      <Box twClassName="min-w-0 flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1.5"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {asset.title}
          </Text>
          {asset.label ? <AssetLabel label={asset.label} /> : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {asset.address}
        </Text>
      </Box>
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {asset.balance}
    </Text>
  </Box>
);

export default AccountAssetRow;
