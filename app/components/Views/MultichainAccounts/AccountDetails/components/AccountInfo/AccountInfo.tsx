import React from 'react';
import {
  AlignItems,
  JustifyContent,
  FlexDirection,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import Avatar, {
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './AccountInfo.styles';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import AddressCopy from '../../../../../UI/AddressCopy';
import { IconColor } from '@metamask/design-system-react-native';
import { formatAddress } from '../../../../../../util/address';
import { getFormattedAddressFromInternalAccount } from '../../../../../../core/Multichain/utils';

interface AccountInfoProps {
  account: InternalAccount;
}

export const AccountInfo = ({ account }: AccountInfoProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const formattedAddress = getFormattedAddressFromInternalAccount(account);

  return (
    <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.center}>
      <Avatar
        style={styles.avatar}
        variant={AvatarVariant.Account}
        accountAddress={formattedAddress}
      />
      <Text variant={TextVariant.BodyLGMedium} style={styles.address}>
        {account.metadata.name}
      </Text>
      <Box
        style={styles.copyAddress}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
      >
        <Text variant={TextVariant.BodyLGMedium} color={colors.primary.default}>
          {formatAddress(formattedAddress, 'short')}
        </Text>
        <AddressCopy account={account} iconColor={IconColor.PrimaryDefault} />
      </Box>
    </Box>
  );
};
