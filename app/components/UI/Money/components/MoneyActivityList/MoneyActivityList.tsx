import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';
import MoneyActivityRow from '../MoneyActivityRow/MoneyActivityRow';
import { TransactionMeta } from '@metamask/transaction-controller';

export const MAX_PREVIEW_ITEMS = 5;

interface MoneyActivityListProps {
  items: MoneyActivityItem[];
  moneyAddress?: string;
  /** Whether more activity exists beyond what's fetched (paginated upstream). */
  hasMore?: boolean;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
  onItemPress?: (transaction: TransactionMeta) => void;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
}

const MoneyActivityList = ({
  items,
  moneyAddress,
  hasMore = false,
  onViewAllPress,
  onHeaderPress,
  onItemPress,
  privacyMode = false,
}: MoneyActivityListProps) => {
  if (!items.length) {
    return null;
  }

  const previewItems = items.slice(0, MAX_PREVIEW_ITEMS);
  const hasMoreItems = items.length > MAX_PREVIEW_ITEMS || hasMore;

  return (
    <Box testID={MoneyActivityListTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-3 pb-1">
        <MoneySectionHeader
          title={strings('money.activity.title')}
          onPress={hasMoreItems ? onHeaderPress : undefined}
        />
      </Box>
      {previewItems.map((item) => (
        <MoneyActivityRow
          key={item.id}
          item={item}
          moneyAddress={moneyAddress}
          onPress={onItemPress}
          privacyMode={privacyMode}
        />
      ))}
      {hasMoreItems && onViewAllPress && (
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
