import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsAccountValue } from './ActivityDetailsAccountValue';
import { ActivityDetailsPayNetworkRow } from './ActivityDetailsPayNetworkRow';
import {
  formatPerpsTransactionDate,
  type PerpsActivityListItem,
} from './ActivityDetailsPerps.utils';

/**
 * Metadata for a perps deposit/withdrawal. `isDeposit` drives the Network row —
 * see {@link ActivityDetailsPayNetworkRow}.
 */
export function ActivityDetailsPerpsMetadata({
  item,
  isDeposit,
}: {
  item: PerpsActivityListItem;
  isDeposit: boolean;
}) {
  const selectedAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={strings('activity_details.status')}
        value={<ActivityDetailsStatus status={item.status} />}
        testID={ActivityDetailsSelectorsIDs.STATUS_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.date')}
        value={formatPerpsTransactionDate(item.timestamp)}
        testID={ActivityDetailsSelectorsIDs.DATE_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.account')}
        value={
          selectedAccount?.address ? (
            <ActivityDetailsAccountValue
              address={selectedAccount.address}
              chainId={item.chainId}
            />
          ) : undefined
        }
        testID={ActivityDetailsSelectorsIDs.ACCOUNT_ROW}
      />
      <ActivityDetailsPayNetworkRow item={item} isDeposit={isDeposit} />
    </ActivityDetailSection>
  );
}
