import { useSelector } from 'react-redux';

import { selectSignatureSecurityAlertResponse } from '../selectors/security-alerts';

// todo: the hook to be extended to include transactions
export function useSecurityAlertResponse() {
  const { securityAlertResponse } = useSelector(
    selectSignatureSecurityAlertResponse,
  );

  return { securityAlertResponse };
}
