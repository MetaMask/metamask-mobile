import React from 'react';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { useActivityPayMetadata } from '../hooks/useActivityPayMetadata';
import { ActivityDetailRow } from './ActivityDetailsLayout';
import { ActivityDetailsNetworkValue } from './ActivityDetailsNetworkValue';

/**
 * Network row for a Perps or Predict funding activity.
 *
 * Names `metamaskPay.chainId` rather than `item.chainId`, which is the
 * provider's settlement chain (Arbitrum, Polygon) injected by the Activity list,
 * not where the user paid. Deposits show no network: they span the payment chain
 * and the settlement chain, and the step timeline already names both.
 *
 * @param props.item - Row to name the network for.
 * @param props.isDeposit - Whether the row is a deposit.
 * @returns The Network row, or `null` for a deposit.
 */
export function ActivityDetailsPayNetworkRow({
  item,
  isDeposit,
}: {
  item: ActivityListItem;
  isDeposit: boolean;
}) {
  const pay = useActivityPayMetadata(item);
  const chainId = pay?.chainId ?? item.chainId;
  const networkName = useActivityNetworkName(chainId);

  if (isDeposit) {
    return null;
  }

  return (
    <ActivityDetailRow
      label={strings('activity_details.network')}
      value={
        <ActivityDetailsNetworkValue chainId={chainId} name={networkName} />
      }
      testID={ActivityDetailsSelectorsIDs.NETWORK_ROW}
    />
  );
}
