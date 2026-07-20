import {
  TransactionStatus as KeyringTransactionStatus,
  type Transaction,
} from '@metamask/keyring-api';
import { strings } from '../../../locales/i18n';

/**
 * Custom labels for non-EVM transactions.
 *
 * The labels are used to map the transaction type to the title in the activity list and dialog.
 * The labels are defined in the `transaction.details.typeLabel` property.
 * For details: {@link https://github.com/MetaMask/metamask-extension/pull/38040}
 */
export enum CustomTransactionTypeLabel {
  // Token requires one off approve to receive
  TrustlineApprove = 'trustline-approve',
  // Token requires revoke the approve to stop receiving
  TrustlineDisapprove = 'trustline-disapprove',
}

export function hasTrustlineTypeLabel(
  details: Transaction['details'],
): boolean {
  // A flag to indicate if the transaction is a trustline type.
  return [
    String(CustomTransactionTypeLabel.TrustlineApprove),
    String(CustomTransactionTypeLabel.TrustlineDisapprove),
  ].includes(details?.typeLabel ?? '');
}

function withOptionalSymbol(label: string, symbol?: string): string {
  return symbol ? `${label} ${symbol}` : label;
}

/**
 * Returns a localized activity title for asset activation/deactivation flows from a transaction.
 *
 * @param status - The transaction status.
 * @param tokenSymbol - The symbol of the token.
 * @param isActivate - A flag to indicate if the transaction is an activation or deactivation.
 * @returns A localized activity title for asset activation/deactivation flows from a transaction.
 */
export function resolveAssetActivationActivityTitle(
  status: KeyringTransactionStatus,
  tokenSymbol: string | undefined,
  isActivate: boolean,
): string {
  switch (status) {
    case KeyringTransactionStatus.Confirmed:
      return withOptionalSymbol(
        isActivate
          ? strings('transactions.activity_trustline_activated')
          : strings('transactions.activity_trustline_deactivated'),
        tokenSymbol,
      );
    case KeyringTransactionStatus.Failed:
      return isActivate
        ? strings('transactions.activity_trustline_activation_failed')
        : strings('transactions.activity_trustline_deactivation_failed');
    default:
      return withOptionalSymbol(
        isActivate
          ? strings('transactions.activity_trustline_activating')
          : strings('transactions.activity_trustline_deactivating'),
        tokenSymbol,
      );
  }
}
