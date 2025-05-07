import { useSelector } from 'react-redux';

import { selectSignatureSecurityAlertResponse } from '../../selectors/security-alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

// todo: the hook to be extended to include transactions
export function useSecurityAlertResponse() {
  const transactionMetadata = useTransactionMetadataRequest();

  const { securityAlertResponse: signatureSecurityAlertResponse } = useSelector(
    selectSignatureSecurityAlertResponse,
  );

  return {
    securityAlertResponse:
      transactionMetadata?.securityAlertResponse ??
      signatureSecurityAlertResponse,
  };
}
