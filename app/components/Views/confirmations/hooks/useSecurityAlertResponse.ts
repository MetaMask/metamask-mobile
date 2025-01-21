import { useSelector } from 'react-redux';

import { selectSignatureSecurityAlertResponse } from '../selectors/security-alerts';

export function useSecurityAlertResponse() {
  const { securityAlertResponse } = useSelector(
    selectSignatureSecurityAlertResponse,
  );

  return { securityAlertResponse };
}
