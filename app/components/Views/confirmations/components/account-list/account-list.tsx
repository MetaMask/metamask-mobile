import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';

import { useAccountAvatarType } from '../../hooks/useAccountAvatarType';
import { useAccounts } from '../../hooks/send/useAccounts';
import { Recipient, type RecipientType } from '../UI/recipient';


export function AccountList() {
  const accounts = useAccounts();
  const accountAvatarType = useAccountAvatarType();

  const handleAccountPress = useCallback(() => {
    // console.log('Selected account:', account);
  }, []);

  const renderItem = useCallback(({ item }: { item: RecipientType }) => (
    <Recipient
      recipient={item}
      accountAvatarType={accountAvatarType}
      onPress={handleAccountPress}
    />
  ), [accountAvatarType, handleAccountPress]);

  const keyExtractor = useCallback((item: RecipientType) => `${item.address}`, []);

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={accounts}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderItem}
      />
    </Box>
  );
}
