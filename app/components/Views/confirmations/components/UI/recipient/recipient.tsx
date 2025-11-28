import React, { useCallback } from 'react';
import { KeyringAccountType } from '@metamask/keyring-api';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  ButtonBase,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { formatAddress } from '../../../../../../util/address';
import styleSheet from './recipient.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { AccountTypeLabel } from '../account-type-label';
import { ACCOUNT_TYPE_LABELS } from '../../../../../../constants/account-type-labels';
import { AccountGroupId } from '@metamask/account-api';
import { useSelector } from 'react-redux';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../../../../reducers';

export interface RecipientType {
  address: string;
  accountName?: string;
  accountGroupId?: AccountGroupId;
  accountGroupName?: string;
  accountType?: string;
  contactName?: string;
  walletName?: string;
}
interface RecipientProps {
  recipient: RecipientType;
  isSelected?: boolean;
  isBIP44?: boolean;
  accountAvatarType: AvatarAccountType;
  onPress?: (recipient: RecipientType) => void;
}

export function Recipient({
  recipient,
  isSelected,
  isBIP44,
  accountAvatarType,
  onPress,
}: RecipientProps) {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});

  // Always default to recipient address if account group has no associated icon seed
  // address (which should never really happen).
  const accountAvatarSeedAddress = useSelector((state: RootState) => {
    if (!recipient.accountGroupId) return recipient.address;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(
        recipient.accountGroupId,
      );
      return selector(state);
    } catch {
      return recipient.address;
    }
  });

  const handlePressRecipient = useCallback(() => {
    onPress?.(recipient);
  }, [recipient, onPress]);

  const typeLabel =
    ACCOUNT_TYPE_LABELS[recipient.accountType as KeyringAccountType];

  return (
    <ButtonBase
      testID={
        isSelected
          ? `selected-${recipient.address}`
          : `recipient-${recipient.address}`
      }
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between h-18 rounded-none',
          pressed || isSelected ? 'bg-pressed' : 'bg-transparent',
        )
      }
      onPress={handlePressRecipient}
    >
      <Box twClassName="flex-row items-center">
        <Box twClassName="h-12 justify-center">
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            accountAddress={accountAvatarSeedAddress}
            size={AvatarSize.Md}
          />
        </Box>
        <Box twClassName="ml-4 h-12 justify-center flex-1">
          <Text
            testID={`recipient-name-${recipient.address}`}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {isBIP44
              ? recipient.accountGroupName || recipient.contactName
              : recipient.accountName || recipient.contactName}
          </Text>
          <Box twClassName="flex-row items-center">
            <Text
              testID={`recipient-address-${recipient.address}`}
              variant={TextVariant.BodyMd}
              style={styles.recipientAddress}
              numberOfLines={1}
            >
              {formatAddress(recipient.address, 'short')}
            </Text>
            <AccountTypeLabel label={typeLabel} />
          </Box>
        </Box>
      </Box>
    </ButtonBase>
  );
}
