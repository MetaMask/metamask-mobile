import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { isSignatureRequest } from './confirm';

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
});
