import React, { useCallback, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import { useSelector, shallowEqual } from 'react-redux';

import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { RootState } from '../../../../../reducers';
import { type Wallet } from '../../hooks/send/useWallets';
import { Recipient } from '../UI/recipient';

interface RecipientListProps {
  wallets: (Wallet | null)[];
}

export function RecipientList({ wallets }: RecipientListProps) {
  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const flattenedData = useMemo(() => {
    return wallets.reduce((acc: any, wallet: any) => {
      wallet.accounts.forEach((accountGroup: any) => {
        acc.push({
          type: 'account',
          accountGroupName: accountGroup.accountGroupName,
          address: accountGroup.account.address,
          id: accountGroup.account.id,
        });
      });

      return acc;
    }, []);
  }, [wallets]);

  const handleRecipientPress = useCallback((recipient: any) => {
    console.log('Selected recipient:', recipient);
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'account') {
      return (
        <Recipient
          recipient={item}
          accountAvatarType={accountAvatarType}
          onPress={handleRecipientPress}
        />
      );
    }
    return null;
  }, [accountAvatarType, handleRecipientPress]);

  const keyExtractor = useCallback((item: any) => `${item.id}`, []);

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={flattenedData}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderItem}
      />
    </Box>
  );
}
