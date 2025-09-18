import React, { useCallback } from 'react';

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

export interface RecipientType {
  address: string;
  accountName?: string;
  accountGroupName?: string;
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

  const handlePressRecipient = useCallback(() => {
    onPress?.(recipient);
  }, [recipient, onPress]);

  return (
    <ButtonBase
      testID={
        isSelected
          ? `selected-${recipient.address}`
          : `recipient-${recipient.address}`
      }
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between h-18',
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
            accountAddress={recipient.address}
            size={AvatarSize.Md}
          />
        </Box>

        <Box twClassName="ml-4 h-12 justify-center">
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
          <Text
            testID={`recipient-address-${recipient.address}`}
            variant={TextVariant.BodyMd}
            style={styles.recipientAddress}
            numberOfLines={1}
          >
            {formatAddress(recipient.address, 'short')}
          </Text>
        </Box>
      </Box>
    </ButtonBase>
  );
}
