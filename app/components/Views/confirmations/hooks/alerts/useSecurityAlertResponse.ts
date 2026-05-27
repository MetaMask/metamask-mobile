import { useSelector } from 'react-redux';

import { selectSecurityAlertResponseByConfirmationId } from '../../selectors/security-alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { RootState } from '../../../../../reducers';
import { ResultType } from '../../constants/signatures';

export function useSecurityAlertResponse() {
  const transactionMetadata = useTransactionMetadataRequest();
  const signatureRequest = useSignatureRequest();

  // Get the ID from either transaction or signature request
  // For signatures, also check messageParams.requestId which contains the RPC request ID
  // that ppom-util uses as the key when storing security alerts
  const confirmationId =
    transactionMetadata?.id ??
    signatureRequest?.messageParams?.requestId?.toString() ??
    signatureRequest?.id;

  const securityAlertResponse = useSelector((state: RootState) =>
    confirmationId
      ? selectSecurityAlertResponseByConfirmationId(state, confirmationId)
      : undefined,
  );

  // TODO: TEMPORARY — local testing of the scam questionnaire. Forces every
  // confirmation in dev builds to look malicious so the questionnaire fires.
  // Remove before merging.
  if (__DEV__) {
    return {
      securityAlertResponse: {
        result_type: ResultType.Malicious,
        reason: 'transfer_farming',
      } as never,
    };
  }

  // For transactions, prefer the response from TransactionController state
  // as it may be more up-to-date
  return {
    securityAlertResponse:
      transactionMetadata?.securityAlertResponse ?? securityAlertResponse,
  };
}
