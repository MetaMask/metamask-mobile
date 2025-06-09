import { TransactionType } from '@metamask/transaction-controller';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { isSignatureRequest, isStakingConfirmation } from './confirm';

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
});
