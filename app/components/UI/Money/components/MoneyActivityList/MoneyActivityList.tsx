import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import MoneySectionHeader from '../MoneySectionHeader';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';
import MoneyActivityRow from '../MoneyActivityRow/MoneyActivityRow';
import { TransactionMeta } from '@metamask/transaction-controller';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';

export const MAX_PREVIEW_ITEMS = 5;

interface MoneyActivityListProps {
  items: MoneyActivityItem[];
  moneyAddress?: string;
  /** Whether more activity exists beyond what's fetched (paginated upstream). */
  hasMore?: boolean;
  onHeaderPress?: () => void;
  onItemPress?: (transaction: TransactionMeta) => void;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
  cardEnrichmentByHash?: Map<string, CardTransaction>;
}

const MoneyActivityList = ({
  items,
  moneyAddress,
  hasMore = false,
  onHeaderPress,
  onItemPress,
  privacyMode = false,
  cardEnrichmentByHash,
}: MoneyActivityListProps) => {
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

  if (!items.length) {
    return null;
  }

  const previewItems = items.slice(0, MAX_PREVIEW_ITEMS);
  const hasMoreItems = items.length > MAX_PREVIEW_ITEMS || hasMore;

  return (
    <Box testID={MoneyActivityListTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-3 pb-3">
        <MoneySectionHeader
          testID={MoneyActivityListTestIds.HEADER}
          title={strings('money.activity.title')}
          onPress={hasMoreItems && onHeaderPress ? onHeaderPress : undefined}
        />
      </Box>
      {previewItems.map((item) => (
        <MoneyActivityRow
          key={item.id}
          item={item}
          moneyAddress={moneyAddress}
          onPress={activityDetailsEnabled ? onItemPress : undefined}
          privacyMode={privacyMode}
          cardEnrichmentByHash={cardEnrichmentByHash}
        />
      ))}
    </Box>
  );
};

export default MoneyActivityList;
