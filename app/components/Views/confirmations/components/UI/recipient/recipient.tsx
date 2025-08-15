import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

export interface RecipientType {
  name: string;
  address: string;
  fiatValue?: string;
}

interface RecipientProps {
  recipient: RecipientType;
  isSelected?: boolean;
  accountAvatarType: AvatarAccountType;
  onPress?: (recipient: RecipientType) => void;
}

export function Recipient({
  recipient,
  isSelected,
  accountAvatarType,
  onPress,
}: RecipientProps) {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress?.(recipient);
  }, [recipient, onPress]);

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2 px-4',
          pressed || isSelected ? 'bg-pressed' : 'bg-transparent',
        )
      }
      onPress={handlePress}
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
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {recipient.name}
          </Text>
        </Box>
      </Box>
      {recipient.fiatValue && (
        <Box twClassName="h-12 justify-center items-end">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            numberOfLines={1}
          >
            {recipient.fiatValue}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}
