import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import logger from '../SDKConnectV2/services/logger';

/**
 * Matches `@metamask/agentic-sdk` `PAIRING_CANCELLED_TYPE` so CLI
 * `receiveCliTokenOverMwp` rejects with PAIRING_CANCELLED / MWP_CANCELLED.
 */
export const PAIRING_CANCELLED_TYPE = 'pairing-cancelled' as const;

export interface PairingCancelledMessagePayload {
  type: typeof PAIRING_CANCELLED_TYPE;
}

/**
 * Notifies the waiting CLI that Mobile authorization will not complete, so it
 * can abort its auth-token wait (MMAI-979) instead of hanging until timeout.
 */
export const sendPairingCancelledToClient = async (
  client: WalletClient,
  connectionId: string,
): Promise<void> => {
  const payload: PairingCancelledMessagePayload = {
    type: PAIRING_CANCELLED_TYPE,
  };

  logger.debug('Sending pairing-cancelled message:', connectionId);
  await client.sendResponse(payload);
};
