import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';

export const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

export function isSignatureRequest(requestType: string) {
  return [
    ApprovalTypes.PERSONAL_SIGN,
    ApprovalTypes.ETH_SIGN_TYPED_DATA,
  ].includes(requestType as ApprovalTypes);
}
