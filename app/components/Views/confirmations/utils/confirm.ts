import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import {
  SIGNATURE_APPROVAL_TYPES,
  REDESIGNED_TRANSACTION_TYPES,
} from '../constants/confirmations';

export const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

const TRANSACTION_TYPES_TO_SKIP_RENDER_CONFIRMATION = [
  TransactionType.swap,
  TransactionType.swapAndSend,
  TransactionType.swapApproval,
];

export function isSignatureRequest(requestType: string) {
  return [
    ApprovalTypes.PERSONAL_SIGN,
    ApprovalTypes.ETH_SIGN_TYPED_DATA,
  ].includes(requestType as ApprovalTypes);
}

export function isStakingConfirmation(requestType: string) {
  return [
    TransactionType.stakingDeposit,
    TransactionType.stakingUnstake,
    TransactionType.stakingClaim,
  ].includes(requestType as TransactionType);
}

/**
 * Determines if the confirmation modal should be navigated to for the given approval.
 *
 * The confirmation modal handles:
 * - Signatures: personal_sign, eth_signTypedData
 * - Transactions: All transaction types except swap-related transactions
 * - Batch transactions: Used for EIP-7702 account delegation
 *
 * Returns false (does not navigate) when:
 * - The approval type is not a redesigned confirmation type
 * - The transaction is a swap-related transaction (swap, swapAndSend, swapApproval)
 * - The confirmation should be displayed full-screen (handled by dedicated UI)
 *
 * Other approval types have dedicated components:
 * - wallet_requestPermissions → PermissionApproval
 * - wallet_watchAsset → WatchAssetApproval
 * - wallet_addEthereumChain → AddChainApproval
 * - wallet_switchEthereumChain → SwitchChainApproval
 * - Template confirmations, Snap installs, WalletConnect, etc.
 *
 * @param approvalType - The approval type from ApprovalRequest
 * @param transactionMetadata - The transaction metadata, if available
 * @param isFullScreenConfirmation - Whether this is a full-screen confirmation
 * @returns true if the confirmation modal should be navigated to
 */
export function shouldNavigateConfirmationModal(
  approvalType: string,
  transactionMetadata: TransactionMeta | undefined,
  isFullScreenConfirmation: boolean,
): boolean {
  // 1. Signature types always use modal
  if (SIGNATURE_APPROVAL_TYPES.includes(approvalType as ApprovalType)) {
    return true;
  }

  // 2. Batch transactions always use modal
  if (approvalType === ApprovalType.TransactionBatch) {
    return true;
  }

  // 3. Regular transactions - check type and conditions
  if (approvalType === ApprovalTypes.TRANSACTION) {
    // Skip swap-related transactions (handled by dedicated swap UI)
    if (
      transactionMetadata &&
      TRANSACTION_TYPES_TO_SKIP_RENDER_CONFIRMATION.includes(
        transactionMetadata.type as TransactionType,
      )
    ) {
      return false;
    }

    // Full screen confirmations handle their own navigation
    if (isFullScreenConfirmation) {
      return false;
    }

    // Valid transaction types use modal
    if (
      transactionMetadata &&
      REDESIGNED_TRANSACTION_TYPES.includes(
        transactionMetadata.type as TransactionType,
      )
    ) {
      return true;
    }
  }

  // 4. All other approval types (wallet_requestPermissions, wallet_watchAsset, etc.)
  // These are handled by RootRPCMethodsUI.js, not ConfirmRoot
  return false;
}
