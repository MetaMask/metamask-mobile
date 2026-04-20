import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';
import MoneyActivityItem from '../MoneyActivityItem/MoneyActivityItem';

const MAX_PREVIEW_ITEMS = 5;

interface MoneyActivityListProps {
  transactions: TransactionMeta[];
  moneyAddress?: string;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
  onItemPress?: () => void;
}

const MoneyActivityList = ({
  transactions,
  moneyAddress,
  onViewAllPress,
  onHeaderPress,
  onItemPress,
}: MoneyActivityListProps) => {
  if (!transactions.length) {
    return null;
  }

  const previewItems = transactions.slice(0, MAX_PREVIEW_ITEMS);

  return (
    <Box testID={MoneyActivityListTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-3 pb-1">
        <MoneySectionHeader
          title={strings('money.activity.title')}
          onPress={onHeaderPress}
        />
      </Box>
      {previewItems.map((item) => (
        <MoneyActivityItem
          key={item.id}
          tx={item}
          moneyAddress={moneyAddress}
          onPress={onItemPress}
        />
      ))}
      {onViewAllPress && (
        <Box twClassName="px-4 my-3">
          <Button
            variant={ButtonVariant.Secondary}
            isFullWidth
            onPress={onViewAllPress}
            testID={MoneyActivityListTestIds.VIEW_ALL_BUTTON}
          >
            {strings('money.activity.view_all')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MoneyActivityList;
