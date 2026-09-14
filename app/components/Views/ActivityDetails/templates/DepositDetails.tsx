import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsAmountHeader } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

export function DepositDetails({
  item,
}: {
  item: Extract<
    ActivityListItem,
    {
      type:
        | 'buy'
        | 'claim'
        | 'claimMusdBonus'
        | 'deposit'
        | 'stake'
        | 'unstake';
    }
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
