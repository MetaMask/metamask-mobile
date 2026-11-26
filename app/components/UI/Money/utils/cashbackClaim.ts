import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import type { CardCashbackClaim } from '../../../../core/Engine/controllers/card-controller/types';
import { strings } from '../../../../../locales/i18n';
import { areAddressesEqual } from '../../../../util/address';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import type { AccountsApiActivity } from '../types/moneyActivity';
import { moneyFormatUsd } from './moneyFormatFiat';
import { formatMusdAmount } from './moneyAmount';

const CASHBACK_CLAIM_TTL_MS = 10 * 60 * 1000;
const CASHBACK_CLAIM_TIME_TOLERANCE_MS = 60 * 1000;

export function cashbackClaimDisplayInfo(
  claim: CardCashbackClaim,
): MoneyTransactionDisplayInfo {
  const failed = claim.status === 'failed';
  return {
    label: failed
      ? strings('money.transaction.cashback')
      : strings('money.transaction.receiving'),
    description: failed
      ? strings('money.transaction.failed')
      : strings('money.transaction.cashback'),
    primaryAmount: formatMusdAmount(
      failed ? new BigNumber(0) : new BigNumber(claim.amount),
      true,
    ),
    fiatAmount: failed ? `+${moneyFormatUsd(new BigNumber(0))}` : '',
    isIncoming: true,
    icon: IconName.Card,
    status: failed ? 'failed' : 'pending',
    showPrimaryAmount: !failed,
  };
}

export function isSettlingCashbackActivity(
  claim: CardCashbackClaim,
  activity: readonly AccountsApiActivity[],
): boolean {
  const claimAmount = new BigNumber(claim.amount);
  return activity.some((item) => {
    if (item.kind !== 'cashback') {
      return false;
    }
    if (item.hash.toLowerCase() === claim.txHash?.toLowerCase()) {
      return true;
    }
    if (item.time < claim.submittedAt - CASHBACK_CLAIM_TIME_TOLERANCE_MS) {
      return false;
    }
    return claimAmount.eq(
      new BigNumber(item.amount).shiftedBy(-item.token.decimals),
    );
  });
}

export function isCashbackClaimExpired(
  claim: CardCashbackClaim,
  now: number = Date.now(),
  ttlMs: number = CASHBACK_CLAIM_TTL_MS,
): boolean {
  return now - claim.submittedAt >= ttlMs;
}

export interface CashbackClaimResolution {
  visibleClaim: CardCashbackClaim | null;
  shouldClear: boolean;
}

export function resolveCashbackClaim(
  claim: CardCashbackClaim | null,
  activity: readonly AccountsApiActivity[],
  moneyAddress: string | undefined,
  now: number = Date.now(),
): CashbackClaimResolution {
  if (!claim) {
    return { visibleClaim: null, shouldClear: false };
  }
  const shouldClear =
    isSettlingCashbackActivity(claim, activity) ||
    isCashbackClaimExpired(claim, now);
  const visibleClaim =
    !shouldClear &&
    moneyAddress &&
    areAddressesEqual(claim.moneyAddress, moneyAddress)
      ? claim
      : null;
  return { visibleClaim, shouldClear };
}
