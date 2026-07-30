import React from 'react';
import { BigNumber } from 'bignumber.js';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import useFiatFormatter from '../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from './ActivityDetailsLayout';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

/** Pay records its fiat values in USD, not the user's display currency. */
const PAY_FIAT_CURRENCY = 'usd';

/**
 * MetaMask Pay's pre-aggregated fiat fees, read off the row's local transaction.
 * Pay-routed rows carry no token-denominated `data.fees`, so this is their only
 * fee source — the same one the legacy details screen reads.
 */
function getActivityPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  return item.raw?.type === 'localTransaction'
    ? item.raw.data.primaryTransaction?.metamaskPay
    : undefined;
}

/**
 * Whether {@link ActivityDetailsPayFeesAndTotal} renders anything, so templates
 * can decide up front whether to add its divider.
 */
export function hasActivityPayFees(item: ActivityListItem): boolean {
  const pay = getActivityPayMetadata(item);
  return Boolean(pay?.networkFeeFiat || pay?.bridgeFeeFiat || pay?.totalFiat);
}

/**
 * Network fee / bridge fee / total for a MetaMask Pay-routed transaction. Rows
 * with no recorded value are omitted; a recorded zero still shows (`$0`).
 */
export function ActivityDetailsPayFeesAndTotal({
  item,
}: {
  item: ActivityListItem;
}) {
  const formatFiat = useFiatFormatter({ currency: PAY_FIAT_CURRENCY });
  const pay = getActivityPayMetadata(item);

  if (!hasActivityPayFees(item)) {
    return null;
  }

  const formatPayFiat = (value: string | undefined) =>
    value ? formatFiat(new BigNumber(value)) : undefined;

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={strings('activity_details.network_fee')}
        value={formatPayFiat(pay?.networkFeeFiat)}
        testID={ActivityDetailsSelectorsIDs.FEE_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.bridge_fee')}
        value={formatPayFiat(pay?.bridgeFeeFiat)}
        testID={ActivityDetailsSelectorsIDs.FEE_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.total_amount')}
        value={formatPayFiat(pay?.totalFiat)}
        testID={ActivityDetailsSelectorsIDs.TOTAL_ROW}
      />
    </ActivityDetailSection>
  );
}
