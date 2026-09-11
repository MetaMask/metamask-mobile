import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getNetworkImageSource } from '../../../../../util/networks';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import type { Hex } from '@metamask/utils';

interface ContactNetworkSelectorProps {
  chainId: Hex;
  editable: boolean;
  networkName: string;
  onOpen: () => void;
}

export const ContactNetworkSelector = ({
  chainId,
  editable,
  networkName,
  onOpen,
}: ContactNetworkSelectorProps) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      disabled={!editable}
      style={tw.style(
        'h-12 flex-row items-center justify-between gap-3 rounded-lg border border-muted bg-muted px-4',
        !editable && 'opacity-50',
      )}
      onPress={onOpen}
      onLongPress={onOpen}
      testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
    >
      <Box twClassName="flex-row items-center gap-2">
        <AvatarNetwork
          size={AvatarNetworkSize.Sm}
          name={networkName}
          src={getNetworkImageSource({ chainId })}
        />
        <Text>{networkName}</Text>
      </Box>
      {editable ? (
        <ButtonIcon
          iconName={IconName.ArrowDown}
          size={ButtonIconSize.Md}
          onPress={onOpen}
          accessibilityRole="button"
        />
      ) : null}
    </TouchableOpacity>
  );
};
