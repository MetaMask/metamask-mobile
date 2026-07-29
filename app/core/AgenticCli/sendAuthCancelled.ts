import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import logger from '../SDKConnectV2/services/logger';

export interface AuthCancelledMessagePayload {
  type: 'auth-cancelled';
  reason?: string;
}

/**
 * Notifies the waiting CLI that Mobile authorization will not complete, so it
 * can abort its auth-token wait (MMAI-979) instead of hanging until timeout.
 */
export const sendAuthCancelledToClient = async (
  client: WalletClient,
  connectionId: string,
  reason?: string,
): Promise<void> => {
  const payload: AuthCancelledMessagePayload = {
    type: 'auth-cancelled',
  };
  if (reason !== undefined && reason.length > 0) {
    payload.reason = reason;
  }

  logger.debug('Sending auth cancelled message:', connectionId, {
    reason: payload.reason,
  });
  await client.sendResponse(payload);
};
