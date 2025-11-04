import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  AvatarToken,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge from '../../../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../../../component-library/components/Badges/Badge/Badge.types';
import { BadgePosition } from '../../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { Nft as NftType } from '../../../types/token';

interface NftProps {
  readonly asset: NftType;
  readonly onPress: (asset: NftType) => void;
}

export function Nft({ asset, onPress }: NftProps) {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(asset);
  }, [asset, onPress]);

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2',
          pressed ? 'bg-pressed' : 'bg-transparent',
        )
      }
      onPress={handlePress}
    >
      <Box twClassName="flex-row items-center px-4">
        <Box twClassName="h-12 justify-center">
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              asset.networkBadgeSource ? (
                <Badge
                  variant={BadgeVariant.Network}
                  name={asset.name || asset.collectionName || 'NFT'}
                  imageSource={asset.networkBadgeSource}
                  size={AvatarSize.Xs}
                />
              ) : undefined
            }
          >
            <AvatarToken
              name={asset.name || asset.collectionName || 'NFT'}
              src={asset.image ? { uri: asset.image } : undefined}
              style={tw.style('w-10 h-10')}
            />
          </BadgeWrapper>
        </Box>

        <Box twClassName="ml-4 h-12 justify-center">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {asset.collectionName || asset.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {asset.standard === 'ERC1155' && `(${asset.balance}) `}
            {asset.standard === 'ERC721' ? `#${asset.tokenId}` : asset.name}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
