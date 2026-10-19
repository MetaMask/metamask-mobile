import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeNetwork,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import { ImportAsset } from '../../utils/utils';

interface AddAssetTokenRowProps {
  asset: ImportAsset;
  networkName?: string;
}

const AddAssetTokenRow = ({ asset, networkName }: AddAssetTokenRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="flex-1 h-16"
  >
    <Box>
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          <BadgeNetwork
            src={NetworkBadgeSource(asset.chainId as `0x${string}`)}
            name={networkName}
            twClassName="h-5 w-5"
          />
        }
      >
        {asset.image && (
          <AvatarToken
            name={asset.symbol}
            src={{ uri: asset.image }}
            size={AvatarTokenSize.Lg}
          />
        )}
      </BadgeWrapper>
    </Box>
    <Box twClassName="flex-1 ml-5 justify-center">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {asset.name}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {asset.symbol}
      </Text>
    </Box>
  </Box>
);

export default AddAssetTokenRow;
