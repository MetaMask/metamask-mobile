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

/**
 * The type-agnostic metadata block: status, date, account (or from/to), network
 * row. From/To/Account rows carry an account avatar and the network row carries
 * its network badge.
 */
export function ActivityDetailsMetadata({ item }: { item: ActivityListItem }) {
  const { from, to } = getActivityFromTo(item);
  const networkName = useActivityNetworkName(item.chainId);
  const showFromTo = Boolean(from && to);
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

      {showFromTo ? (
        <>
          <ActivityDetailRow
            label={strings('activity_details.from')}
            value={
              <ActivityDetailsAccountValue
                address={from}
                chainId={item.chainId}
              />
            }
            testID={ActivityDetailsSelectorsIDs.FROM_ROW}
          />
          <ActivityDetailRow
            label={strings('activity_details.to')}
            value={
              <ActivityDetailsAccountValue
                address={to}
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
        value={item.hash ? renderShortAddress(item.hash) : undefined}
        testID={ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW}
      />
    </ActivityDetailSection>
  );
}
