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

import NetworkAssetLogo from '../../../../../../components/UI/NetworkAssetLogo';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge from '../../../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../../../component-library/components/Badges/Badge/Badge.types';
import { BadgePosition } from '../../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import { AssetType } from '../../../types/token';

interface TokenProps {
  asset: AssetType;
  onPress: (asset: AssetType) => void;
}

export function Token({ asset, onPress }: TokenProps) {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(asset);
  }, [asset, onPress]);

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2',
          pressed || asset.isSelected ? 'bg-pressed' : 'bg-transparent',
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
                  name={asset.name || asset.symbol || 'Token'}
                  imageSource={asset.networkBadgeSource}
                  size={AvatarSize.Xs}
                />
              ) : undefined
            }
          >
            {asset.isNative ? (
              <NetworkAssetLogo
                big={false}
                biggest={false}
                chainId={asset.chainId as string}
                style={tw.style('w-10 h-10 rounded-full bg-default')}
                ticker={asset.symbol as string}
              />
            ) : (
              <AvatarToken
                name={asset.symbol || asset.name || 'Token'}
                src={asset.image ? { uri: asset.image } : undefined}
                style={tw.style('w-10 h-10')}
              />
            )}
          </BadgeWrapper>
        </Box>

        <Box twClassName="ml-4 h-12 justify-center">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {asset.name || asset.symbol || 'Unknown Token'}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {asset.symbol}
          </Text>
        </Box>
      </Box>
      <Box twClassName="px-4 h-12 justify-center items-end">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {asset?.balanceInSelectedCurrency}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {asset.balance} {asset.symbol}
        </Text>
      </Box>
    </Pressable>
  );
}
