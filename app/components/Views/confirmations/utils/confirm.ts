import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { REDESIGNED_SIGNATURE_TYPES } from '../constants/confirmations';

export const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

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
 * Checks if an approval type should use the redesigned confirmation flow.
 *
 * The redesigned confirmation modal handles:
 * - Signatures: personal_sign, eth_signTypedData
 * - Transactions: All transaction types in REDESIGNED_TRANSACTION_TYPES
 *
 * Other approval types have dedicated components:
 * - wallet_requestPermissions → PermissionApproval
 * - wallet_watchAsset → WatchAssetApproval
 * - wallet_addEthereumChain → AddChainApproval
 * - wallet_switchEthereumChain → SwitchChainApproval
 * - Template confirmations, Snap installs, WalletConnect, etc.
 *
 * @param approvalType - The approval type from ApprovalRequest
 * @returns true if the approval should use the redesigned confirmation flow
 */
export function isRedesignedConfirmationType(approvalType: string): boolean {
  if (REDESIGNED_SIGNATURE_TYPES.includes(approvalType as ApprovalType)) {
    return true;
  }

  if (approvalType === ApprovalTypes.TRANSACTION) {
    return true;
  }

  return false;
}
