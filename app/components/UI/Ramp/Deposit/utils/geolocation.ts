import { TRANSAK_API_URL, TRANSAK_GEOLOCATION_ENDPOINT } from '../constants';

export interface GeolocationResponse {
  ipCountryCode: string;
}

export async function getGeolocation(): Promise<GeolocationResponse> {
  if (!TRANSAK_API_URL) {
    throw new Error('Transak API URL is not set');
  }

  const myURL = new URL(TRANSAK_GEOLOCATION_ENDPOINT, TRANSAK_API_URL);

  const response = await fetch(myURL.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Transak geolocation API request failed with status: ${response.status}`,
    );
  }

  const data = await response.json();

  if (!data.ipCountryCode) {
    throw new Error('Invalid geolocation response: missing ipCountryCode');
  }

  return data;
}
