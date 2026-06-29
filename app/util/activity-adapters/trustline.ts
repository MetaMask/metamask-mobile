import { TransactionType, type Transaction } from '@metamask/keyring-api';
import { strings } from '../../../locales/i18n';

export const TRUSTLINE_APPROVE_LABEL = 'trustline-approve' as const;
export const TRUSTLINE_DISAPPROVE_LABEL = 'trustline-disapprove' as const;

export function isTrustlineApproveTransaction(
  transaction: Transaction,
): boolean {
  return (
    transaction.details?.typeLabel === TRUSTLINE_APPROVE_LABEL ||
    transaction.type === TransactionType.TokenApprove
  );
}

export function isTrustlineDisapproveTransaction(
  transaction: Transaction,
): boolean {
  return (
    transaction.details?.typeLabel === TRUSTLINE_DISAPPROVE_LABEL ||
    transaction.type === TransactionType.TokenDisapprove
  );
}

export function isTrustlineTransaction(transaction: Transaction): boolean {
  return (
    isTrustlineApproveTransaction(transaction) ||
    isTrustlineDisapproveTransaction(transaction)
  );
}

/**
 * Returns a localized activity title for Stellar trustline activate/deactivate flows.
 */
export function resolveTrustlineActivityTitle(
  tokenSymbol: string | undefined,
  isActivate: boolean,
): string {
  if (isActivate) {
    return tokenSymbol
      ? strings('transactions.trustline_activated_unit', {
          unit: tokenSymbol,
        })
      : strings('transactions.trustline_activated');
  }

  return tokenSymbol
    ? strings('transactions.trustline_deactivated_unit', {
        unit: tokenSymbol,
      })
    : strings('transactions.trustline_deactivated');
}
