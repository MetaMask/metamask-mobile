import React from 'react';
import {
  AlignItems,
  JustifyContent,
  FlexDirection,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import {
  AvatarAccount,
  AvatarAccountSize,
  FontWeight,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './AccountInfo.styles';
import AddressCopy from '../../../../../UI/AddressCopy';
import { formatAddress } from '../../../../../../util/address';
import { getFormattedAddressFromInternalAccount } from '../../../../../../core/Multichain/utils';

interface AccountInfoProps {
  account: InternalAccount;
}

export const AccountInfo = ({ account }: AccountInfoProps) => {
  const { styles } = useStyles(styleSheet, {});

  const formattedAddress = getFormattedAddressFromInternalAccount(account);

  return (
    <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.center}>
      <AvatarAccount
        style={styles.avatar}
        address={formattedAddress}
        size={AvatarAccountSize.Md}
      />
      <Text
        variant={TextVariant.BodyLg}
        fontWeight={FontWeight.Medium}
        style={styles.address}
      >
        {account.metadata.name}
      </Text>
      <Box
        style={styles.copyAddress}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
      >
        <Text
          variant={TextVariant.BodyLg}
          fontWeight={FontWeight.Medium}
          color={TextColor.PrimaryDefault}
        >
          {formatAddress(formattedAddress, 'short')}
        </Text>
        <AddressCopy iconColor={IconColor.PrimaryDefault} />
      </Box>
    </Box>
  );
};
