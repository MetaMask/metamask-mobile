import { Hex } from '@metamask/utils';
import { SecurityAlertResponse } from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';

const ENDPOINT_VALIDATE = 'validate';
const ENDPOINT_SUPPORTED_CHAINS = 'supportedChains';

export interface SecurityAlertsAPIRequest {
  method: string;
  params: unknown[];
}

export function isSecurityAlertsAPIEnabled() {
  return process.env.SECURITY_ALERTS_API_ENABLED === 'true';
}

export async function validateWithSecurityAlertsAPI(
  chainId: string,
  payload: SecurityAlertsAPIRequest,
): Promise<SecurityAlertResponse> {
  const endpoint = `${ENDPOINT_VALIDATE}/${chainId}`;
  return request(endpoint, payload);
}

export async function getSecurityAlertsAPISupportedChainIds(): Promise<Hex[]> {
  return request(ENDPOINT_SUPPORTED_CHAINS);
}

async function request(endpoint: string, options?: RequestInit) {
  const url = getUrl(endpoint);

  const response = await fetch(url, options);

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
