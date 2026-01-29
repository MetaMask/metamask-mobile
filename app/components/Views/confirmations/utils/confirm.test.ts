import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import {
  isSignatureRequest,
  isStakingConfirmation,
  shouldNavigateConfirmationModal,
} from './confirm';

describe('Confirmation utils', () => {
  describe('isSignatureRequest', () => {
    it('should return correct value', async () => {
      expect(isSignatureRequest(ApprovalTypes.PERSONAL_SIGN)).toBeTruthy();
      expect(
        isSignatureRequest(ApprovalTypes.ETH_SIGN_TYPED_DATA),
      ).toBeTruthy();
      expect(isSignatureRequest(ApprovalTypes.TRANSACTION)).toBeFalsy();
    });
  });

  describe('isStakingConfirmation', () => {
    it('should return correct value', async () => {
      expect(
        isStakingConfirmation(TransactionType.stakingDeposit),
      ).toBeTruthy();
      expect(isStakingConfirmation(TransactionType.bridge)).toBeFalsy();
    });
  });

  describe('shouldNavigateConfirmationModal', () => {
    const mockTransactionMetadata = {
      type: TransactionType.simpleSend,
    } as TransactionMeta;

    it('returns true for signature types when not full-screen', () => {
      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.PERSONAL_SIGN,
          undefined,
          false,
        ),
      ).toBe(true);

      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.ETH_SIGN_TYPED_DATA,
          undefined,
          false,
        ),
      ).toBe(true);
    });

    it('returns true for transaction types when not full-screen', () => {
      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.TRANSACTION,
          mockTransactionMetadata,
          false,
        ),
      ).toBe(true);
    });

    it('returns true for batch transaction types when not full-screen', () => {
      expect(
        shouldNavigateConfirmationModal(
          ApprovalType.TransactionBatch,
          undefined,
          false,
        ),
      ).toBe(true);
    });

    it('returns false for swap transaction types', () => {
      const swapMetadata = {
        type: TransactionType.swap,
      } as TransactionMeta;

      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.TRANSACTION,
          swapMetadata,
          false,
        ),
      ).toBe(false);
    });

    it('returns false for swapAndSend transaction types', () => {
      const swapAndSendMetadata = {
        type: TransactionType.swapAndSend,
      } as TransactionMeta;

      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.TRANSACTION,
          swapAndSendMetadata,
          false,
        ),
      ).toBe(false);
    });

    it('returns false for swapApproval transaction types', () => {
      const swapApprovalMetadata = {
        type: TransactionType.swapApproval,
      } as TransactionMeta;

      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.TRANSACTION,
          swapApprovalMetadata,
          false,
        ),
      ).toBe(false);
    });

    it('returns false when isFullScreenConfirmation is true for transaction types', () => {
      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.TRANSACTION,
          mockTransactionMetadata,
          true,
        ),
      ).toBe(false);
    });

    it('returns true for signature types even when isFullScreenConfirmation is true', () => {
      expect(
        shouldNavigateConfirmationModal(
          ApprovalTypes.PERSONAL_SIGN,
          undefined,
          true,
        ),
      ).toBe(true);
    });

    it('returns false for other approval types', () => {
      expect(
        shouldNavigateConfirmationModal(
          'wallet_requestPermissions',
          undefined,
          false,
        ),
      ).toBe(false);

      expect(
        shouldNavigateConfirmationModal('wallet_watchAsset', undefined, false),
      ).toBe(false);

      expect(
        shouldNavigateConfirmationModal(
          'wallet_addEthereumChain',
          undefined,
          false,
        ),
      ).toBe(false);
    });
  });
});
