import React from 'react';
import { strings } from '../../../../../locales/i18n';
import {
  getActivityFromTo,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import { formatTimestampToDateTime } from '../../../../util/date';
import { renderShortAddress } from '../../../../util/address';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsAccountValue } from './ActivityDetailsAccountValue';
import { ActivityDetailsNetworkValue } from './ActivityDetailsNetworkValue';
import { ActivityDetailsTransactionId } from './ActivityDetailsTransactionId';

/**
 * The type-agnostic metadata block: status, date, account, network, and a
 * copyable transaction id.
 *
 * From/To is opt-in per template: a caller passes `addressRows={{ from, to }}`
 * (Send and NFT do) to render a From/To pair. Every other activity type — swaps,
 * approvals, contract interactions, etc. — shows a single Account row, mirroring
 * the extension's `MetadataSection`. A smart-account upgrade is self-referential
 * and shows a single Address row.
 */
export function ActivityDetailsMetadata({
  item,
  addressRows,
}: {
  item: ActivityListItem;
  addressRows?: { from?: string; to?: string };
}) {
  const { from, to } = getActivityFromTo(item);
  const networkName = useActivityNetworkName(item.chainId);
  const showAddressOnly = item.type === 'smartAccountUpgrade';
  const showFromTo =
    !showAddressOnly && Boolean(addressRows?.from && addressRows?.to);
  const fromAddress = addressRows?.from ?? '';
  const toAddress = addressRows?.to ?? '';
  const accountAddress = from || to;

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={strings('activity_details.status')}
        value={<ActivityDetailsStatus status={item.status} />}
        testID={ActivityDetailsSelectorsIDs.STATUS_ROW}
      />

      <ActivityDetailRow
        label={strings('activity_details.date')}
        value={formatTimestampToDateTime(item.timestamp)}
        testID={ActivityDetailsSelectorsIDs.DATE_ROW}
      />

      {showAddressOnly ? (
        <ActivityDetailRow
          label={strings('activity_details.address')}
          value={
            accountAddress ? renderShortAddress(accountAddress) : undefined
          }
          testID={ActivityDetailsSelectorsIDs.ADDRESS_ROW}
        />
      ) : showFromTo ? (
        <>
          <ActivityDetailRow
            label={strings('activity_details.from')}
            value={
              <ActivityDetailsAccountValue
                address={fromAddress}
                chainId={item.chainId}
              />
            }
            testID={ActivityDetailsSelectorsIDs.FROM_ROW}
          />
          <ActivityDetailRow
            label={strings('activity_details.to')}
            value={
              <ActivityDetailsAccountValue
                address={toAddress}
                chainId={item.chainId}
              />
            }
            testID={ActivityDetailsSelectorsIDs.TO_ROW}
          />
        </>
      ) : (
        <ActivityDetailRow
          label={strings('activity_details.account')}
          value={
            accountAddress ? (
              <ActivityDetailsAccountValue
                address={accountAddress}
                chainId={item.chainId}
              />
            ) : undefined
          }
          testID={ActivityDetailsSelectorsIDs.ACCOUNT_ROW}
        />
      )}

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

      <ActivityDetailRow
        label={strings('activity_details.transaction_id')}
        value={
          item.hash ? (
            <ActivityDetailsTransactionId hash={item.hash} />
          ) : undefined
        }
        testID={ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW}
      />
    </ActivityDetailSection>
  );
}
