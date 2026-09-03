import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the activity list's amount resolver; route-isolation backlog
import { useActivityListItemRowContent } from '../../../UI/ActivityListItemRow/useActivityListItemRowContent';
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
  const { avatarTokens, primaryAmount } = useActivityListItemRowContent(item);

  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={
        <ActivityDetailsApprovalTokenSection
          token={avatarTokens[0]}
          chainId={item.chainId}
          capLabel={primaryAmount}
        />
      }
      showTotal={false}
    />
  );
}
