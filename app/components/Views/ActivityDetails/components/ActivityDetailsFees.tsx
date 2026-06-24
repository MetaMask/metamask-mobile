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
import { ActivityDetailsFeeValue } from './ActivityDetailsFeeValue';
import {
  useActivityAmountsFiat,
  type ActivityFeeFiatRow,
} from '../hooks/useActivityAmountsFiat';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

function ActivityDetailsFeeRowsContent({
  feeRows,
  chainId,
}: {
  feeRows: ActivityFeeFiatRow[];
  chainId: string;
}) {
  if (!feeRows.length) {
    return null;
  }

  return (
    <ActivityDetailSection>
      {feeRows.map((fee, index) => (
        <ActivityDetailRow
          key={`${fee.label}-${fee.fee.type}-${index}`}
          label={fee.label}
          value={
            <ActivityDetailsFeeValue
              fee={fee.fee}
              value={fee.value}
              chainId={chainId}
            />
          }
          testID={ActivityDetailsSelectorsIDs.FEE_ROW}
        />
      ))}
    </ActivityDetailSection>
  );
}

function getTotalRowValue({
  totalFiat,
  totalToken,
  fiatOnly,
}: {
  totalFiat?: string;
  totalToken?: TokenAmount;
  fiatOnly: boolean;
}) {
  return fiatOnly
    ? totalFiat
    : (totalFiat ?? formatActivityTokenAmount(totalToken, { showPlus: false }));
}

function ActivityDetailsTotalRowContent({
  totalFiat,
  token,
  fiatOnly,
}: {
  totalFiat?: string;
  token?: TokenAmount;
  fiatOnly: boolean;
}) {
  const value = getTotalRowValue({
    totalFiat,
    totalToken: token,
    fiatOnly,
  });

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

function getDefaultTotalToken(item: ActivityListItem) {
  return 'token' in item.data
    ? (item.data.token as TokenAmount | undefined)
    : undefined;
}

/**
 * Renders a fiat value per fee (network/protocol). Fees are sourced from the
 * activity adapter (`item.data.fees`) and converted to fiat at render time,
 * mirroring the extension. Renders nothing when there are no fees / no rate.
 */
export function ActivityDetailsFeeRows({ item }: { item: ActivityListItem }) {
  const { feeRows } = useActivityAmountsFiat(item);

  return (
    <ActivityDetailsFeeRowsContent feeRows={feeRows} chainId={item.chainId} />
  );
}

/**
 * Renders the transaction "Total amount". Prefers the fiat total (token + fees)
 * and falls back to the token amount when no fiat rate is available.
 */
export function ActivityDetailsTotalRow({
  item,
  token,
  fiatOnly = false,
}: {
  item: ActivityListItem;
  token?: TokenAmount;
  fiatOnly?: boolean;
}) {
  const { totalFiat } = useActivityAmountsFiat(item, token);
  const totalToken = token ?? getDefaultTotalToken(item);

  return (
    <ActivityDetailsTotalRowContent
      totalFiat={totalFiat}
      token={totalToken}
      fiatOnly={fiatOnly}
    />
  );
}

export function ActivityDetailsFeesAndTotal({
  item,
  token,
  fiatOnly = false,
}: {
  item: ActivityListItem;
  token?: TokenAmount;
  fiatOnly?: boolean;
}) {
  const { feeRows, totalFiat } = useActivityAmountsFiat(item, token);
  const totalToken = token ?? getDefaultTotalToken(item);
  const totalValue = getTotalRowValue({ totalFiat, totalToken, fiatOnly });

  if (!feeRows.length && !totalValue) {
    return null;
  }

  return (
    <ActivityDetailSection>
      <ActivityDetailsFeeRowsContent feeRows={feeRows} chainId={item.chainId} />
      <ActivityDetailsTotalRowContent
        totalFiat={totalFiat}
        token={totalToken}
        fiatOnly={fiatOnly}
      />
    </ActivityDetailSection>
  );
}
