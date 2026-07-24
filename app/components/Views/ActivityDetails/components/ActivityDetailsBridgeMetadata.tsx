import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { formatTimestampToDateTime } from '../../../../util/date';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsAccountValue } from './ActivityDetailsAccountValue';
import { ActivityDetailsNetworkValue } from './ActivityDetailsNetworkValue';
import { ActivityDetailsTransactionId } from './ActivityDetailsTransactionId';

function BridgeNetworkValue({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: string;
  destinationChainId?: string;
}) {
  const sourceName = useActivityNetworkName(sourceChainId);
  const destinationName = useActivityNetworkName(
    destinationChainId ?? sourceChainId,
  );

  if (!destinationChainId || destinationChainId === sourceChainId) {
    return (
      <ActivityDetailsNetworkValue chainId={sourceChainId} name={sourceName} />
    );
  }

  return (
    <Box twClassName="flex-row items-center gap-2 shrink">
      <ActivityDetailsNetworkValue chainId={sourceChainId} name={sourceName} />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {'→'}
      </Text>
      <ActivityDetailsNetworkValue
        chainId={destinationChainId}
        name={destinationName}
      />
    </Box>
  );
}

export function ActivityDetailsBridgeMetadata({
  item,
  bridgeHistoryItem,
  destinationChainId,
}: {
  item: Extract<ActivityListItem, { type: 'bridge' }>;
  bridgeHistoryItem: BridgeHistoryItem | undefined;
  destinationChainId?: string;
}) {
  const accountAddress = bridgeHistoryItem?.account;

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
      <ActivityDetailRow
        label={strings('activity_details.network')}
        value={
          <BridgeNetworkValue
            sourceChainId={item.chainId}
            destinationChainId={destinationChainId}
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
