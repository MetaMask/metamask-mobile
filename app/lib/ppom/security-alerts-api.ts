import { SecurityAlertResponse } from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';

const ENDPOINT_VALIDATE = 'validate';

export interface SecurityAlertAPIRequest {
  method: string;
  params: any[];
}

export function isEnabled() {
  return process.env.SECURITY_ALERTS_API_ENABLED === 'true';
}

export async function validate(
  chainId: string,
  request: SecurityAlertAPIRequest,
): Promise<SecurityAlertResponse> {
  const url = getUrl(chainId, ENDPOINT_VALIDATE);

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json() as Promise<SecurityAlertResponse>;
}

function getUrl(chainId: string, endpoint: string) {
  return `${process.env.SECURITY_ALERTS_API_URL}/${endpoint}/${chainId}`;
}
