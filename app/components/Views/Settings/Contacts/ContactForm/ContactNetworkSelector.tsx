import React from 'react';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  FontWeight,
  SelectButton,
  SelectButtonSize,
  Text,
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
}: ContactNetworkSelectorProps) =>
  editable ? (
    <SelectButton
      isFullWidth
      size={SelectButtonSize.Lg}
      twClassName="px-4"
      value={networkName}
      contentWrapperProps={{ twClassName: 'w-full justify-between' }}
      textProps={{ twClassName: 'text-left grow px-1' }}
      startAccessory={
        <AvatarNetwork
          size={AvatarNetworkSize.Sm}
          name={networkName}
          src={getNetworkImageSource({ chainId })}
        />
      }
      onPress={onOpen}
      testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
    />
  ) : (
    <Box
      twClassName="flex-row items-center gap-2"
      testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
    >
      <AvatarNetwork
        size={AvatarNetworkSize.Sm}
        name={networkName}
        src={getNetworkImageSource({ chainId })}
      />
      <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
        {networkName}
      </Text>
    </Box>
  );
