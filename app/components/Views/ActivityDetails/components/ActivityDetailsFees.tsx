import React from 'react';
import { strings } from '../../../../../locales/i18n';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { formatActivityTokenAmount } from './activityTokenFormat';
import { useActivityAmountsFiat } from '../hooks/useActivityAmountsFiat';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

/**
 * Renders a fiat value per fee (network/protocol). Fees are sourced from the
 * activity adapter (`item.data.fees`) and converted to fiat at render time,
 * mirroring the extension. Renders nothing when there are no fees / no rate.
 */
export function ActivityDetailsFeeRows({ item }: { item: ActivityListItem }) {
  const { feeRows } = useActivityAmountsFiat(item);

  if (!feeRows.length) {
    return null;
  }

  return (
    <ActivityDetailSection>
      {feeRows.map((fee) => (
        <ActivityDetailRow
          key={fee.label}
          label={fee.label}
          value={fee.value}
          testID={ActivityDetailsSelectorsIDs.FEE_ROW}
        />
      ))}
    </ActivityDetailSection>
  );
}

/**
 * Renders the transaction "Total amount". Prefers the fiat total (token + fees)
 * and falls back to the token amount when no fiat rate is available.
 */
export function ActivityDetailsTotalRow({ item }: { item: ActivityListItem }) {
  const { totalFiat } = useActivityAmountsFiat(item);
  const token =
    'token' in item.data
      ? (item.data.token as TokenAmount | undefined)
      : undefined;
  const value =
    totalFiat ?? formatActivityTokenAmount(token, { showPlus: false });

  if (!value) {
    return null;
  }

  return (
    <ActivityDetailRow
      label={strings('activity_details.total_amount')}
      value={value}
      testID={ActivityDetailsSelectorsIDs.TOTAL_ROW}
    />
  );
}
