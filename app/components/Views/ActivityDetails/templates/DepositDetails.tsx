import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsAmountHeader } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

/**
 * Single-asset details for Earn/Staking deposits, unstakes and reward claims.
 * Shows the moved token, metadata, network fee and total — mirroring
 * ClaimMusdBonusDetails.
 */
export function DepositDetails({
  item,
}: {
  item: Extract<
    ActivityListItem,
    { type: 'buy' | 'claim' | 'deposit' | 'unstake' }
  >;
}) {
  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsAmountHeader item={item} />}
      token={item.data.token}
    />
  );
}
