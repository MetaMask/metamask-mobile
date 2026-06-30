import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsApprovalTokenSection } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

export function ApprovalDetails({
  item,
}: {
  item: Extract<
    ActivityListItem,
    { type: 'approveSpendingCap' | 'revokeSpendingCap' | 'increaseSpendingCap' }
  >;
}) {
  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsApprovalTokenSection token={item.data.token} />}
      showTotal={false}
    />
  );
}
