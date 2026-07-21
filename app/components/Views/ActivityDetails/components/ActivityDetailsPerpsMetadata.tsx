import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsAccountValue } from './ActivityDetailsAccountValue';
import { ActivityDetailsNetworkValue } from './ActivityDetailsNetworkValue';
import {
  formatPerpsTransactionDate,
  type PerpsActivityListItem,
} from './ActivityDetailsPerps.utils';

export function ActivityDetailsPerpsMetadata({
  item,
}: {
  item: PerpsActivityListItem;
}) {
  const networkName = useActivityNetworkName(item.chainId);
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
      <ActivityDetailRow
        label={strings('activity_details.network')}
        value={
          <ActivityDetailsNetworkValue
            chainId={item.chainId}
            name={networkName}
          />
        }
        testID={ActivityDetailsSelectorsIDs.NETWORK_ROW}
      />
    </ActivityDetailSection>
  );
}
