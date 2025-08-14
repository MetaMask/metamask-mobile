import React, { useCallback, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  Box,
  Text,
  TextVariant,
  AvatarToken,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';

import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { useStyles } from '../../../../../component-library/hooks';
import { type Wallet } from '../../hooks/send/useWallets';
import styleSheet from './recipient-list.styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { shallowEqual } from 'react-redux';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';

interface RecipientListProps {
  wallets: (Wallet | null)[];
}

export function RecipientList({ wallets }: RecipientListProps) {
  const { styles } = useStyles(styleSheet, {});

  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const flattenedData = useMemo(() => {
    return wallets.reduce((acc: any, wallet: any) => {
      // Add wallet entry
      acc.push({
        type: 'wallet',
        name: wallet.name,
        id: wallet.id,
      });

      // Add account entries
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

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'wallet') {
      return (
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="mt-4"
          fontWeight={FontWeight.Medium}
        >
          {item.name}
        </Text>
      );
    }

    if (item.type === 'account') {
      return (
        <Cell
          variant={CellVariant.Select}
          title={item.accountGroupName}
          avatarProps={{
            variant: AvatarVariant.Account as const,
            type: accountAvatarType,
            accountAddress: item.address,
          }}
          style={{
            alignItems: 'center',
          }}
        />
      );
    }

    return null;
  }, []);

  const keyExtractor = useCallback((item: any) => `${item.id}`, []);

  return (
    <Box twClassName="flex-1">
      <FlashList
        data={flattenedData}
        decelerationRate={0}
        keyExtractor={keyExtractor}
        removeClippedSubviews
        renderItem={renderItem}
        contentContainerStyle={styles.flashListContainer}
      />
    </Box>
  );
}
