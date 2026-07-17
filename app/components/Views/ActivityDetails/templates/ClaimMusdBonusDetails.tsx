import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsAmountHeader } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

export function ClaimMusdBonusDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'claimMusdBonus' }>;
}) {
  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsAmountHeader item={item} />}
      token={item.data.token}
    />
  );
}
