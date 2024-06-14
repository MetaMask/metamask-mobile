import { SecurityAlertResponse } from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';

const ENDPOINT_VALIDATE = 'validate';

export interface SecurityAlertsAPIRequest {
  method: string;
  params: any[];
}

export function isSecurityAlertsAPIEnabled() {
  return process.env.SECURITY_ALERTS_API_ENABLED === 'true';
}

export async function validateWithSecurityAlertsAPI(
  chainId: string,
  request: SecurityAlertsAPIRequest,
): Promise<SecurityAlertResponse> {
  const endpoint = `${ENDPOINT_VALIDATE}/${chainId}`;
  return postRequest(endpoint, request);
}

async function postRequest(endpoint: string, body: any) {
  const url = getUrl(endpoint);

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Security alerts API request failed with status: ${response.status}`,
    );
  }

  return response.json();
}

function getUrl(endpoint: string) {
  const host = process.env.SECURITY_ALERTS_API_URL;

  if (!host) {
    throw new Error('Security alerts API URL is not set');
  }

  return `${host}/${endpoint}`;
}
