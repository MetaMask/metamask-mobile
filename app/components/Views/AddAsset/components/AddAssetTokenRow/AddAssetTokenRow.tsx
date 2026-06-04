import React from 'react';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import {
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
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <BadgeNetwork
            imageSource={NetworkBadgeSource(asset.chainId as `0x${string}`)}
            name={networkName}
          />
        }
      >
        {asset.image && (
          <AvatarToken
            name={asset.symbol}
            imageSource={{ uri: asset.image }}
            size={AvatarSize.Lg}
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
