import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';

import { NetworkManagementItem } from '../NetworksManagementView.types';
import { NetworksManagementViewSelectorsIDs } from '../NetworksManagementView.testIds';

interface AdditionalNetworkItemProps {
  item: NetworkManagementItem;
  onAdd: (chainId: string) => void;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const AdditionalNetworkItem = ({ item, onAdd }: AdditionalNetworkItemProps) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="pl-4 py-4 pr-2"
      testID={NetworksManagementViewSelectorsIDs.NETWORK_ITEM(item.chainId)}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1"
      >
        <Box twClassName="mr-4">
          <AvatarNetwork
            name={item.name}
            size={AvatarSize.Md}
            imageSource={item.imageSource}
          />
        </Box>
        <Text variant={TextVariant.BodyMd}>{item.name}</Text>
      </Box>
      <Pressable
        onPress={() => onAdd(item.chainId)}
        hitSlop={HIT_SLOP}
        style={({ pressed }) =>
          tw.style(
            'w-7 h-7 items-center justify-center rounded-lg bg-background-muted mr-2.5',
            pressed && 'opacity-70',
          )
        }
      >
        <Icon
          name={IconName.Add}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Pressable>
    </Box>
  );
};

export default React.memo(AdditionalNetworkItem);
