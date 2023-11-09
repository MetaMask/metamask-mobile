import { SecurityAlertResponse } from '../../components/UI/BlockaidBanner/BlockaidBanner.types';

/**
 * Clears transaction object completely
 */
export default function setSignatureRequestSecurityAlertResponse(
  securityAlertResponse?: SecurityAlertResponse,
) {
  return {
    type: 'SIGNATURE_REQUEST_SECURITY_ALERT_RESPONSE',
    securityAlertResponse,
  };
}
