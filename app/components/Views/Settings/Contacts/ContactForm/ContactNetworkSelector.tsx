import React from 'react';
import { Pressable } from 'react-native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Icon,
  IconName,
  IconSize,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  const networkAvatar = (
    <AvatarNetwork
      size={AvatarNetworkSize.Sm}
      name={networkName}
      src={getNetworkImageSource({ chainId })}
    />
  );

  return (
    <Pressable
      onPress={editable ? onOpen : undefined}
      disabled={!editable}
      testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
    >
      <TextField
        value={networkName}
        isReadOnly
        startAccessory={networkAvatar}
        inputElement={
          <Text
            variant={TextVariant.BodyMd}
            numberOfLines={1}
            twClassName="flex-1"
          >
            {networkName}
          </Text>
        }
        endAccessory={
          editable ? (
            <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
          ) : undefined
        }
        pointerEvents="none"
      />
    </Pressable>
  );
};
