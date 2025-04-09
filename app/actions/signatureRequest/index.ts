import { SecurityAlertResponse } from '../../components/Views/confirmations/legacy/components/BlockaidBanner/BlockaidBanner.types';

/**
 * Clears transaction object completely
 */
export default function setSignatureRequestSecurityAlertResponse(
  securityAlertResponse?: SecurityAlertResponse,
) {
  return {
    type: 'SET_SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE',
    securityAlertResponse,
  };
}
