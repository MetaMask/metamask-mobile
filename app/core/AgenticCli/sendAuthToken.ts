import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import logger from '../SDKConnectV2/services/logger';

interface AuthTokenMessagePayload {
  type: 'auth-token';
  token: string;
  scope?: string;
}

export const sendAuthTokenToClient = async (
  client: WalletClient,
  connectionId: string,
  authToken: string,
  scope?: string,
): Promise<void> => {
  const payload: AuthTokenMessagePayload = {
    type: 'auth-token',
    token: authToken,
  };
  if (scope !== undefined) {
    payload.scope = scope;
  }

  logger.debug('Sending auth token message:', connectionId, {
    hasAuthToken: Boolean(authToken),
    scope,
  });
  await client.sendResponse(payload);
};
