import React from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarBaseSize,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';
import { getNetworkImageSource } from '../../../../util/networks';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import {
  getActivityFromTo,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsStatus } from './ActivityDetailsStatus';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

/** Formats a millisecond timestamp into a full date + time string. */
function formatActivityDetailDate(timestamp: number): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/** Account avatar + shortened address, right-aligned for a metadata row value. */
function AddressValue({
  address,
  accountVariant,
}: {
  address: string;
  accountVariant: ReturnType<typeof getAvatarAccountVariant>;
}) {
  return (
    <Box twClassName="flex-row items-center gap-2 shrink">
      <AvatarAccount
        address={address}
        variant={accountVariant}
        size={AvatarBaseSize.Sm}
      />
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {renderShortAddress(address)}
      </Text>
    </Box>
  );
}

/** Network badge + network name, right-aligned for the network row value. */
function NetworkValue({ chainId, name }: { chainId: string; name: string }) {
  const networkImage = getNetworkImageSource({ chainId });

  return (
    <Box twClassName="flex-row items-center gap-2 shrink">
      {networkImage ? (
        <AvatarNetwork
          name={name}
          src={networkImage}
          size={AvatarNetworkSize.Sm}
        />
      ) : null}
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {name}
      </Text>
    </Box>
  );
}

/**
 * The type-agnostic metadata block: status, date, account (or from/to), network
 * and transaction id. From/To/Account rows carry an account avatar and the
 * network row carries its network badge.
 */
export function ActivityDetailsMetadata({ item }: { item: ActivityListItem }) {
  const { from, to } = getActivityFromTo(item);
  const networkName = useActivityNetworkName(item.chainId);
  const accountVariant = getAvatarAccountVariant(
    useSelector(selectAvatarAccountType),
  );
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
        value={formatActivityDetailDate(item.timestamp)}
        testID={ActivityDetailsSelectorsIDs.DATE_ROW}
      />

      {showFromTo ? (
        <>
          <ActivityDetailRow
            label={strings('activity_details.from')}
            value={
              <AddressValue address={from} accountVariant={accountVariant} />
            }
            testID={ActivityDetailsSelectorsIDs.FROM_ROW}
          />
          <ActivityDetailRow
            label={strings('activity_details.to')}
            value={
              <AddressValue address={to} accountVariant={accountVariant} />
            }
            testID={ActivityDetailsSelectorsIDs.TO_ROW}
          />
        </>
      ) : (
        <ActivityDetailRow
          label={strings('activity_details.account')}
          value={
            accountAddress ? (
              <AddressValue
                address={accountAddress}
                accountVariant={accountVariant}
              />
            ) : undefined
          }
          testID={ActivityDetailsSelectorsIDs.ACCOUNT_ROW}
        />
      )}

      <ActivityDetailRow
        label={strings('activity_details.network')}
        value={<NetworkValue chainId={item.chainId} name={networkName} />}
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
