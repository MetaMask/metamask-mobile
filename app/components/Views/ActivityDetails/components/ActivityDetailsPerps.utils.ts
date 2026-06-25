import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuse Perps UI utilities until shared perps utilities are extracted. */
import { formatTransactionDate as formatPerpsTransactionDate } from '../../../UI/Perps/utils/formatUtils';
import { getAssetIconUrls as getPerpsAssetIconUrls } from '../../../UI/Perps/utils/marketUtils';
/* eslint-enable import-x/no-restricted-paths */

export type PerpsTransaction = Extract<
  NonNullable<ActivityListItem['raw']>,
  { type: 'perpsTransaction' }
>['data'];

export type PerpsDepositWithdrawalStatus = NonNullable<
  PerpsTransaction['depositWithdrawal']
>['status'];

export type PerpsActivityType =
  | 'perpsAddFunds'
  | 'perpsWithdraw'
  | 'perpsOpenLong'
  | 'perpsCloseLong'
  | 'perpsCloseLongLiquidated'
  | 'perpsCloseLongStopLoss'
  | 'perpsOpenShort'
  | 'perpsCloseShort'
  | 'perpsCloseShortLiquidated'
  | 'perpsCloseShortStopLoss'
  | 'perpsPaidFundingFees'
  | 'perpsReceivedFundingFees'
  | 'perpsCloseShortTakeProfit'
  | 'perpsCloseLongTakeProfit'
  | 'marketShort'
  | 'stopMarketCloseShort'
  | 'marketCloseShort';

export type PerpsActivityListItem = ActivityListItem & {
  type: PerpsActivityType;
};

export function getPerpsTransaction(
  item: ActivityListItem,
): PerpsTransaction | undefined {
  return item.raw?.type === 'perpsTransaction' ? item.raw.data : undefined;
}

export { formatPerpsTransactionDate, getPerpsAssetIconUrls };

export function formatPositivePerpsFiat(fee: number | string): string {
  const value = BigNumber(fee).absoluteValue();

  if (value.isEqualTo(0)) {
    return '$0.00';
  }

  if (value.isLessThan(0.01)) {
    return '<$0.01';
  }

  return `$${value.toFormat(2)}`;
}

export function asPerpsActivityItem(
  item: ActivityListItem,
): PerpsActivityListItem {
  return item as PerpsActivityListItem;
}

export function formatSignedPerpsFiat(
  amount: number | string,
  isPositive: boolean,
): string {
  const absolute = BigNumber(amount).absoluteValue();
  const sign = isPositive ? '+' : '-';

  if (absolute.isEqualTo(0)) {
    return '$0';
  }

  return `${sign}$${absolute.toFixed()}`;
}

export function getPerpsPositionSize(
  fill: PerpsTransaction['fill'],
): string | undefined {
  if (!fill?.size || !fill.entryPrice) {
    return undefined;
  }

  return formatPositivePerpsFiat(
    BigNumber(fill.size).times(fill.entryPrice).absoluteValue().toString(),
  );
}

export function getPerpsPriceLabel(fill: PerpsTransaction['fill']): string {
  return fill?.action === 'Closed' || fill?.action === 'Flipped'
    ? strings('perps.transactions.position.close_price')
    : strings('perps.transactions.position.entry_price');
}

export function getPerpsPriceValue(
  price: string | undefined,
): string | undefined {
  return price ? formatPositivePerpsFiat(price) : undefined;
}

export function shouldShowPerpsPnl(fill: PerpsTransaction['fill']): boolean {
  return Boolean(
    fill?.pnl && (fill.action === 'Closed' || fill.action === 'Flipped'),
  );
}

export function formatPerpsOrderFee(fee: number, isFilled: boolean): string {
  return formatPositivePerpsFiat(isFilled ? fee : 0);
}

export function getPerpsFundsCtaLabel(
  itemStatus: ActivityListItem['status'],
  isDeposit: boolean,
): string {
  if (itemStatus === 'failed') {
    return strings('perps.transactions.try_again');
  }

  return isDeposit
    ? strings('perps.transactions.fund_again')
    : strings('perps.withdrawal.withdraw');
}

export function getPerpsStepLabels(type: 'deposit' | 'withdrawal'): string[] {
  return type === 'deposit'
    ? [
        strings('perps.transactions.steps.approve_funds'),
        strings('perps.transactions.steps.bridge_funds'),
        strings('perps.transactions.steps.receive_usdc'),
        strings('perps.transactions.steps.add_funds'),
      ]
    : [
        strings('perps.transactions.steps.initiate_withdrawal'),
        strings('perps.transactions.steps.process_withdrawal'),
        strings('perps.transactions.steps.receive_funds'),
      ];
}

export function getPerpsCompletedStepCount({
  status,
  totalSteps,
}: {
  status: PerpsDepositWithdrawalStatus;
  totalSteps: number;
}) {
  if (status === 'completed') {
    return totalSteps;
  }

  if (status === 'failed' || status === 'bridging') {
    return Math.max(totalSteps - 1, 1);
  }

  return 1;
}
