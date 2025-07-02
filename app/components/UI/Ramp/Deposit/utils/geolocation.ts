import Logger from '../../../../../util/Logger';
import { TRANSAK_API_URL, TRANSAK_GEOLOCATION_ENDPOINT } from '../constants';

export interface GeolocationResponse {
  ipCountryCode: string;
}

export async function getGeolocation(): Promise<GeolocationResponse> {
  if (!TRANSAK_API_URL) {
    throw new Error('Transak API URL is not set');
  }

  const url = `${TRANSAK_API_URL}/${TRANSAK_GEOLOCATION_ENDPOINT}`;

  try {
    const response = await fetch(url, {
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

    return response.json();
  } catch (error) {
    Logger.error(error as Error, {
      message: 'Transak geolocation API request failed',
      endpoint: TRANSAK_GEOLOCATION_ENDPOINT,
    });
    throw error;
  }
}
