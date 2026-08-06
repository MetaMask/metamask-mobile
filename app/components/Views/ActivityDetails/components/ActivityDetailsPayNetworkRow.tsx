import React from 'react';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityNetworkName } from '../hooks/useActivityNetworkName';
import { useActivityPayMetadata } from '../hooks/useActivityPayMetadata';
import { ActivityDetailRow } from './ActivityDetailsLayout';
import { ActivityDetailsNetworkValue } from './ActivityDetailsNetworkValue';

/**
 * The Network row for a MetaMask-Pay-routed funding activity (Perps and Predict
 * deposits/withdrawals).
 *
 * `item.chainId` cannot back this row. Those rows come from a provider feed with
 * no CAIP-2 of its own, so the list injects the provider's settlement chain —
 * Arbitrum for HyperLiquid, Polygon for Polymarket — which is a constant, not
 * the network the user transacted on. So:
 *
 * Deposits render no row at all, per the Activity redesign. A Pay deposit spans
 * two chains (the payment chain, then the provider's settlement chain), so one
 * network can't name it, and `item.chainId` is the less informative of the two.
 * The step timeline already names both legs.
 *
 * Everything else reads `metamaskPay.chainId` — the chain Pay actually moved the
 * funds on — falling back to the row's own chain when Pay didn't route it (a
 * direct, same-chain funds movement).
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
