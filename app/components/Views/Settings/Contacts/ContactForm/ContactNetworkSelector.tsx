import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import { AddContactViewSelectorsIDs } from '../AddContactView.testIds';
import type { Hex } from '@metamask/utils';
import type { ContactFormStyles } from './ContactForm.styles';

interface ContactNetworkSelectorProps {
  chainId: Hex;
  editable: boolean;
  networkName: string;
  onOpen: () => void;
  styles: ContactFormStyles;
}

export const ContactNetworkSelector = ({
  chainId,
  editable,
  networkName,
  onOpen,
  styles,
}: ContactNetworkSelectorProps) => (
  <TouchableOpacity
    disabled={!editable}
    style={styles.networkSelector}
    onPress={onOpen}
    onLongPress={onOpen}
    testID={AddContactViewSelectorsIDs.NETWORK_INPUT}
  >
    <View style={styles.networkSelectorNetworkName}>
      <AvatarNetwork
        size={AvatarNetworkSize.Sm}
        name={networkName}
        src={getNetworkImageSource({ chainId })}
      />
      <Text style={styles.networkSelectorNetworkNameLabel}>{networkName}</Text>
    </View>
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
