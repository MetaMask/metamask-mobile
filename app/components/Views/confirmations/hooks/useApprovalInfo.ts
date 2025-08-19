import { Hex } from '@metamask/utils';

import { getSIWEDetails } from '../utils/signature';
import { useSignatureRequest } from './signatures/useSignatureRequest';
import { useTransactionBatchesMetadata } from './transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import useApprovalRequest from './useApprovalRequest';

export function useApprovalInfo(): {
  chainId: Hex | undefined;
  fromAddress: string | undefined;
  isSIWEMessage: boolean | undefined;
  url: string | undefined;
} | null {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();
  const { approvalRequest } = useApprovalRequest();

  let chainId: Hex | undefined;
  let fromAddress: string | undefined;
  let isSIWEMessage: boolean | undefined;
  let url: string | undefined;

  if (!approvalRequest) {
    return null;
  }

  if (signatureRequest) {
    chainId = signatureRequest?.chainId;
    isSIWEMessage = getSIWEDetails(signatureRequest).isSIWEMessage;
    fromAddress = signatureRequest?.messageParams?.from;
    url = approvalRequest?.requestData?.meta?.url;
  } else if (transactionMetadata) {
    chainId = transactionMetadata?.chainId;
    fromAddress = transactionMetadata?.txParams?.from;
    url = transactionMetadata?.origin;
  } else if (transactionBatchesMetadata) {
    chainId = transactionBatchesMetadata?.chainId;
    fromAddress = transactionBatchesMetadata?.from;
    url = transactionBatchesMetadata?.origin;
  }

  return {
    chainId,
    fromAddress,
    isSIWEMessage,
    url,
  };
}
