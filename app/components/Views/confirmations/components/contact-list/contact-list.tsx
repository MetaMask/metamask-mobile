import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box, Text } from '@metamask/design-system-react-native';

import { Recipient, RecipientType } from '../UI/recipient';
import { useAccountAvatarType } from '../../hooks/useAccountAvatarType';
import { useContacts } from '../../hooks/send/useContacts';


export function ContactList() {
  const accountAvatarType = useAccountAvatarType();
  const contacts = useContacts();


  const handleContactPress = useCallback(() => {
    // console.log('Selected contact:', contact);
  }, []);

  const renderItem = useCallback(({ item }: { item: RecipientType }) => (
    <Recipient
      recipient={item}
      accountAvatarType={accountAvatarType}
      onPress={handleContactPress}
    />
  ), [accountAvatarType, handleContactPress]);

  const keyExtractor = useCallback((item: RecipientType) => `${item.address}`, []);

  if (contacts.length === 0) {
    return (
      <Box twClassName="flex-1 justify-center items-center p-4">
        <Text>No contacts found</Text>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={contacts}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderItem}
      />
    </Box>
  );
}
