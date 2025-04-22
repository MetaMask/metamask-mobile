import { SecurityAlertResponse } from '../../components/Views/confirmations/legacy/components/BlockaidBanner/BlockaidBanner.types';
import AppConstants from '../../core/AppConstants';

const ENDPOINT_VALIDATE = 'validate';

export interface SecurityAlertsAPIRequest {
  method: string;
  params: unknown[];
}

export function isSecurityAlertsAPIEnabled() {
  return process.env.MM_SECURITY_ALERTS_API_ENABLED === 'true';
}

export async function validateWithSecurityAlertsAPI(
  chainId: string,
  body: SecurityAlertsAPIRequest,
): Promise<SecurityAlertResponse> {
  console.log('[Security Alert] Validating request with API:', {
    chainId,
    body,
    enabled: isSecurityAlertsAPIEnabled(),
  });
  
  const endpoint = `${ENDPOINT_VALIDATE}/${chainId}`;
  const response = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log('[Security Alert] API response:', response);
  return response;
}

async function request(endpoint: string, options?: RequestInit) {
  const url = getUrl(endpoint);
  console.log('[Security Alert] Making request to:', url);

  const response = await fetch(url, options);

  if (!response.ok) {
    console.error('[Security Alert] Request failed:', {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(
      `Security alerts API request failed with status: ${response.status}`,
    );
  }

  return response.json();
}

function getUrl(endpoint: string) {
  const host = AppConstants.SECURITY_ALERTS_API.URL;

  if (!host) {
    console.error('[Security Alert] API URL not set');
    throw new Error('Security alerts API URL is not set');
  }

  return `${host}/${endpoint}`;
}
