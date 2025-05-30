import React, { useMemo } from 'react';
import {
  AlignItems,
  JustifyContent,
  FlexDirection,
} from '../../../../../UI/Box/box.types';
import { Box } from '../../../../../UI/Box/Box';
import Avatar, {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './accountInfo.styles';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import AddressCopy from '../../../../../UI/AddressCopy';
import { IconColor } from '../../../../../../component-library/components/Icons/Icon';
import { formatAddress } from '../../../../../../util/address';
import { getFormattedAddressFromInternalAccount } from '../../../../../../core/Multichain/utils';
import { useSelector } from 'react-redux';

interface AccountInfoProps {
  account: InternalAccount;
}

export const AccountInfo = ({ account }: AccountInfoProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;

  const formattedAddress = useMemo(
    () => getFormattedAddressFromInternalAccount(account),
    [account],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  return (
    <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.center}>
      <Avatar
        style={styles.avatar}
        variant={AvatarVariant.Account}
        accountAddress={formattedAddress}
        type={accountAvatarType}
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
        <AddressCopy account={account} iconColor={IconColor.Primary} />
      </Box>
    </Box>
  );
};
