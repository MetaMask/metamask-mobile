import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box, Text } from '@metamask/design-system-react-native';

import { useAccountAvatarType } from '../../hooks/useAccountAvatarType';
import { useSendContext } from '../../context/send-context/send-context';
import { Recipient, type RecipientType } from '../UI/recipient';

interface RecipientListProps {
  data: RecipientType[];
  emptyMessage?: string;
  onRecipientSelected: (recipient: RecipientType) => void;
}

export function RecipientList({
  data,
  onRecipientSelected,
  emptyMessage,
}: RecipientListProps) {
  const accountAvatarType = useAccountAvatarType();
  const { to } = useSendContext();

  const renderItem = useCallback(
    ({ item }: { item: RecipientType }) => (
      <Recipient
        recipient={item}
        accountAvatarType={accountAvatarType}
        isSelected={to === item.address}
        onPress={onRecipientSelected}
      />
    ),
    [accountAvatarType, onRecipientSelected, to],
  );

  const keyExtractor = useCallback(
    (item: RecipientType) => `${item.address}`,
    [],
  );

  if (data.length === 0 && emptyMessage) {
    return (
      <Box twClassName="flex-1 justify-center items-center p-4">
        <Text>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={data}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderItem}
      />
    </Box>
  );
}
