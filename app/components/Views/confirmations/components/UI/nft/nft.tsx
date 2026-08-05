import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

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

  const testID = `nft-${asset.name || asset.collectionName || 'NFT'}-${asset.tokenId}`;

  return (
    <Pressable
      testID={testID}
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
            position={BadgeWrapperPosition.BottomRight}
            badge={
              asset.networkBadgeSource ? (
                <BadgeNetwork
                  name={asset.name || asset.collectionName || 'NFT'}
                  src={asset.networkBadgeSource as ImageOrSvgSrc}
                  testID="nft-network-badge"
                />
              ) : null
            }
          >
            <AvatarToken
              name={asset.name || asset.collectionName || 'NFT'}
              src={asset.image ? { uri: asset.image } : undefined}
              style={tw.style('w-10 h-10 rounded-xl')}
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
            {asset.standard === 'ERC1155' && `(${asset.balance || 0}) `}
            {asset.standard === 'ERC721' ? `#${asset.tokenId}` : asset.name}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
