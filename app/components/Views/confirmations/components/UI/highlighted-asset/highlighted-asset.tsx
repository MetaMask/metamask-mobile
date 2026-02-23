import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { HighlightedAssetListItem } from '../../../types/token';

interface HighlightedAssetProps {
  item: HighlightedAssetListItem;
}

export function HighlightedAsset({ item }: HighlightedAssetProps) {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    item.action();
  }, [item]);

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2 max-w-full',
          pressed || item.isSelected ? 'bg-pressed' : 'bg-transparent',
        )
      }
      onPress={handlePress}
    >
      <Box twClassName="flex-row items-center px-4 flex-1 min-w-0">
        <Box twClassName="h-12 justify-center">
          <AvatarToken
            name={item.name}
            src={item.icon ? { uri: item.icon } : undefined}
            style={tw.style('w-10 h-10')}
          />
        </Box>

        <Box twClassName="ml-4 h-12 justify-center flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {item.name_description}
          </Text>
        </Box>
      </Box>

      <Box twClassName="px-4 h-12 justify-center items-end shrink-0">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {item.fiat}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {item.fiat_description}
        </Text>
      </Box>
    </Pressable>
  );
}
