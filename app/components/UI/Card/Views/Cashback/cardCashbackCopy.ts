import { formatUnits } from 'ethers/lib/utils';
import { strings } from '../../../../../../locales/i18n';
import type { CardSummaryResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RedeemWalletExtras } from '../../hooks/useRedeemableWallet';
import { formatAmount } from '../RedeemWallet/RedeemWallet.utils';

const KEY = 'card.card_home.cashback_screen';

/** mUSD base units (6 decimals) as a decimal string; `0` when unreadable. */
export function musdFromBaseUnits(value: string | undefined): string {
  if (!value || !/^\d+$/.test(value)) return '0';
  return formatUnits(value, 6);
}

export function formatMusd(baseUnits: string | undefined): string {
  return `${formatAmount(musdFromBaseUnits(baseUnits))} mUSD`;
}

export interface CardCashbackCopy {
  notice?: RedeemWalletExtras['notice'];
  /** Label for the button when the user cannot claim. */
  actionUnavailable: string;
  /** True when no claim can succeed now, whatever the balance. */
  blocksClaim: boolean;
}

/**
 * What the screen says for a Rewards card summary. The raw
 * `blocking_reason` is never shown: every value maps to a sentence, and an
 * unknown one to a generic one.
 */
export function cardCashbackCopy(
  summary: CardSummaryResponse,
  { mpcAccount }: { mpcAccount: boolean },
): CardCashbackCopy {
  const unavailable = strings(`${KEY}.action_unavailable`);
  const blocked = (
    description: string,
    severity: 'info' | 'warning' = 'info',
    actionUnavailable = unavailable,
  ): CardCashbackCopy => ({
    notice: { severity, description },
    actionUnavailable,
    blocksClaim: true,
  });

  // Global: card claiming is closed in this environment.
  if (summary.blocking_reason === 'MECHANISM_NOT_CLAIMABLE') {
    return blocked(
      strings(`${KEY}.notice_not_claimable`),
      'info',
      strings(`${KEY}.action_not_claimable`),
    );
  }
  if (summary.pairing_pending) {
    return blocked(strings(`${KEY}.pairing_pending`));
  }
  if (summary.blocking_reason === 'SUSPENDED') {
    return blocked(strings(`${KEY}.notice_suspended`), 'warning');
  }
  if (mpcAccount) {
    return blocked(strings(`${KEY}.mpc_unavailable`));
  }

  switch (summary.blocking_reason) {
    case null:
      return { actionUnavailable: unavailable, blocksClaim: false };
    case 'NO_ELIGIBLE_BALANCE':
      return {
        actionUnavailable: strings(`${KEY}.action_nothing`),
        blocksClaim: true,
      };
    case 'BELOW_MINIMUM':
      return blocked(
        strings(`${KEY}.below_minimum`, {
          amount: formatMusd(summary.minimum_musd_base_units),
        }),
      );
    case 'UNDER_REVIEW':
      // Only the held part is under review; the rest may still be claimable.
      return {
        notice: {
          severity: 'info',
          description: strings(`${KEY}.notice_under_review`),
        },
        actionUnavailable: unavailable,
        blocksClaim: false,
      };
    case 'EARNING_ADDRESS_UNSCREENABLE':
      return blocked(strings(`${KEY}.notice_temporarily_unavailable`));
    case 'EARNING_ADDRESS_MISSING':
      return blocked(strings(`${KEY}.notice_contact_support`), 'warning');
    case 'VOIDED':
      return blocked(strings(`${KEY}.notice_voided`));
    default:
      return blocked(strings(`${KEY}.notice_generic`));
  }
}

/** Rows shown above the fee: only the buckets that hold something. */
export function cardCashbackBreakdown(
  summary: CardSummaryResponse,
): NonNullable<RedeemWalletExtras['breakdown']> {
  const rows: [keyof CardSummaryResponse, string][] = [
    ['pending', 'pending'],
    ['held', 'held'],
    ['blocked', 'blocked'],
    ['claimed', 'claimed'],
  ];
  return rows
    .filter(([field]) => {
      const value = summary[field];
      return typeof value === 'string' && /^\d+$/.test(value) && value !== '0';
    })
    .map(([field, label]) => ({
      key: field,
      label: strings(`${KEY}.${label}`),
      value: formatMusd(summary[field] as string),
    }));
}

/** Toast after a refused claim, by `claimFailureReason` category. */
export function cardCashbackClaimFailure(category: string): string {
  switch (category) {
    case 'not_claimable':
      return strings(`${KEY}.claim_failed_not_claimable`);
    case 'paused':
      return strings(`${KEY}.claim_failed_paused`);
    case 'below_minimum':
      return strings(`${KEY}.claim_failed_below_minimum`);
    case 'nothing_to_claim':
      return strings(`${KEY}.claim_failed_nothing`);
    case 'wait':
      return strings(`${KEY}.claim_failed_wait`);
    case 'retry':
    case 'payout_migrated':
      return strings(`${KEY}.claim_failed`);
    default:
      return strings(`${KEY}.claim_failed_support`);
  }
}
