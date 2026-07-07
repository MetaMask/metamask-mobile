import {
  TransactionStatus as KeyringTransactionStatus,
  TransactionType,
  type Transaction,
} from '@metamask/keyring-api';
import { strings } from '../../../locales/i18n';
import { getLabelKeys } from './label-keys';
import type { Status } from './types';

export const TRUSTLINE_APPROVE_LABEL = 'trustline-approve' as const;
export const TRUSTLINE_DISAPPROVE_LABEL = 'trustline-disapprove' as const;

export function hasTrustlineTypeLabel(
  details: Transaction['details'],
): boolean {
  return (
    details?.typeLabel === TRUSTLINE_APPROVE_LABEL ||
    details?.typeLabel === TRUSTLINE_DISAPPROVE_LABEL
  );
}

export function isTrustlineApproveTransaction(
  transaction: Transaction,
): boolean {
  return transaction.details?.typeLabel === TRUSTLINE_APPROVE_LABEL;
}

export function isTrustlineDisapproveTransaction(
  transaction: Transaction,
): boolean {
  return transaction.details?.typeLabel === TRUSTLINE_DISAPPROVE_LABEL;
}

export function isTrustlineTransaction(transaction: Transaction): boolean {
  return hasTrustlineTypeLabel(transaction.details);
}

function mapTransactionStatusToActivityStatus(
  transaction: Transaction,
): Status {
  switch (transaction.status) {
    case KeyringTransactionStatus.Confirmed:
      return 'success';
    case KeyringTransactionStatus.Failed:
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Returns a localized activity title for asset activation/deactivation flows.
 */
export function resolveAssetActivationActivityTitle(
  tokenSymbol: string | undefined,
  isActivate: boolean,
  status: Status = 'success',
): string {
  const type = isActivate ? 'assetActivation' : 'assetDeactivation';
  const labelKeys = getLabelKeys({ type, status });

  return strings(labelKeys.title.key, { symbol: tokenSymbol ?? '' });
}

/**
 * @deprecated Use resolveAssetActivationActivityTitle instead.
 */
export function resolveTrustlineActivityTitle(
  tokenSymbol: string | undefined,
  isActivate: boolean,
): string {
  return resolveAssetActivationActivityTitle(tokenSymbol, isActivate);
}

export function resolveAssetActivationActivityTitleFromTransaction(
  transaction: Transaction,
  tokenSymbol: string | undefined,
  isActivate: boolean,
): string {
  return resolveAssetActivationActivityTitle(
    tokenSymbol,
    isActivate,
    mapTransactionStatusToActivityStatus(transaction),
  );
}

export function isTokenApproveTrustlineTransaction(
  transaction: Transaction,
): boolean {
  return (
    transaction.type === TransactionType.TokenApprove &&
    isTrustlineApproveTransaction(transaction)
  );
}

export function isTokenDisapproveTrustlineTransaction(
  transaction: Transaction,
): boolean {
  return (
    transaction.type === TransactionType.TokenDisapprove &&
    isTrustlineDisapproveTransaction(transaction)
  );
}
