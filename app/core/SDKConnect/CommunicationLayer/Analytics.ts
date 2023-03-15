import crossFetch from 'cross-fetch';
import { DEFAULT_SERVER_URL } from './config';
import { CommunicationLayerPreference } from './types/CommunicationLayerPreference';

export interface AnaliticsProps {
  id: string;
  event: unknown;
  originationInfo?: unknown;
  communicationLayerPreference?: CommunicationLayerPreference;
  sdkVersion?: string;
}

export const SendAnalytics = async (
  parameters: AnaliticsProps,
  sockerServerUrl = DEFAULT_SERVER_URL,
) => {
  const serverUrl = `${sockerServerUrl}debug`;

  try {
    const body = JSON.stringify(parameters);
    const response = await crossFetch(serverUrl, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line prettier/prettier
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body,
    });
    await response.text();
  } catch (err) {
    console.warn(`Analytics::SendAnalytics Failed to send parameters`, err);
  }
};
