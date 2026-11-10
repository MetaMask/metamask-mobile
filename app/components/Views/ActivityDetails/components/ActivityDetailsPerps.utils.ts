import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import type {
  ActivityListItem,
  PerpsOrderKind,
} from '../../../../util/activity-adapters';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): reuse Perps UI utilities until shared perps utilities are extracted. */
import {
  formatTransactionDate as formatPerpsTransactionDate,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../UI/Perps/utils/formatUtils';
import { getAssetIconUrls as getPerpsAssetIconUrls } from '../../../UI/Perps/utils/marketUtils';
import type { PerpsTransaction as PerpsTransactionSource } from '../../../UI/Perps/types/transactionHistory';
/* eslint-enable import-x/no-restricted-paths */

export type PerpsTransaction = PerpsTransactionSource;

export type PerpsDepositWithdrawalStatus = NonNullable<
  PerpsTransaction['depositWithdrawal']
>['status'];

type PerpsActivityType =
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
  | PerpsOrderKind;

export type PerpsActivityListItem = ActivityListItem & {
  type: PerpsActivityType;
};

export { formatPerpsTransactionDate, getPerpsAssetIconUrls, formatPerpsFiat };

export function formatSignedPerpsFiat(
  amount: number | string,
  isPositive: boolean,
): string {
  const absolute = BigNumber(amount).absoluteValue();
  const signed = (isPositive ? absolute : absolute.negated()).toString();

  if (absolute.isZero() || absolute.isGreaterThanOrEqualTo(0.01)) {
    return formatPerpsFiat(signed, { sign: 'exceptZero' });
  }

  // Sub-cent funding fees keep every reported digit instead of `<$0.01`:
  // one range at the value's own precision, with no threshold.
  const decimals = absolute.decimalPlaces() ?? 0;
  return formatPerpsFiat(signed, {
    ranges: [
      {
        condition: () => true,
        minimumDecimals: decimals,
        maximumDecimals: decimals,
        threshold: 0,
      },
    ],
    stripTrailingZeros: false,
    sign: 'always',
  });
}

export function getPerpsPositionSize(
  fill: PerpsTransaction['fill'],
): string | undefined {
  if (!fill?.size || !fill.entryPrice) {
    return undefined;
  }

  return formatPerpsFiat(
    BigNumber(fill.size).times(fill.entryPrice).absoluteValue().toString(),
  );
}

export function getPerpsPriceValue(
  price: string | undefined,
): string | undefined {
  return price
    ? formatPerpsFiat(price, { ranges: PRICE_RANGES_UNIVERSAL })
    : undefined;
}

export function shouldShowPerpsPnl(fill: PerpsTransaction['fill']): boolean {
  return Boolean(
    fill && (fill.action === 'Closed' || fill.action === 'Flipped'),
  );
}

export function formatPerpsOrderFee(fee: number): string {
  return formatPerpsFiat(fee, {
    ranges: PRICE_RANGES_UNIVERSAL,
  });
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
