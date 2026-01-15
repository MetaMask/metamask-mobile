import { useMemo } from 'react';

import { useApproveTransactionData } from './useApproveTransactionData';
import { useSignatureRequest } from './signatures/useSignatureRequest';
import {
  isRecognizedPermit,
  isPermitDaiRevoke,
  parseAndNormalizeSignTypedData,
} from '../utils/signature';

interface RevokeOperationResult {
  isRevoke: boolean;
  isLoading: boolean;
}

export function useIsRevokeOperation(): RevokeOperationResult {
  const { isRevoke: isTransactionRevoke, isLoading: isTransactionLoading } =
    useApproveTransactionData();
  const signatureRequest = useSignatureRequest();

  const isSignatureRevoke = useMemo(() => {
    if (!signatureRequest || !isRecognizedPermit(signatureRequest)) {
      return false;
    }

    const msgData = signatureRequest.messageParams?.data;
    if (!msgData || typeof msgData !== 'string') {
      return false;
    }

    try {
      const {
        domain: { verifyingContract },
        message: { allowed, tokenId, value },
      } = parseAndNormalizeSignTypedData(msgData);

      const isNFTPermit = tokenId !== undefined;
      if (isNFTPermit) {
        return false;
      }

      const isDaiRevoke = isPermitDaiRevoke(verifyingContract, allowed, value);
      const isZeroValueRevoke = value === '0';

      return isDaiRevoke || isZeroValueRevoke;
    } catch {
      return false;
    }
  }, [signatureRequest]);

  return {
    isRevoke: Boolean(isTransactionRevoke) || isSignatureRevoke,
    isLoading: isTransactionLoading,
  };
}
