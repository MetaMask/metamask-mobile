import {
  type IKeyManager,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';

import { RELAY_URL } from '../constants';
import { KVStore } from '../../SDKConnectV2/store/kv-store';

export interface CreateQrSyncWalletClientOptions {
  sessionId: string;
  keyManager: IKeyManager;
  relayUrl?: string;
}

export interface QrSyncWalletClientHandle {
  sessionId: string;
  client: WalletClient;
}

/**
 * Bootstraps transport, session store, and wallet client for one QR sync session.
 */
export async function createQrSyncWalletClient({
  sessionId,
  keyManager,
  relayUrl = RELAY_URL,
}: CreateQrSyncWalletClientOptions): Promise<QrSyncWalletClientHandle> {
  const transport = await WebSocketTransport.create({
    url: relayUrl,
    kvstore: new KVStore(`qr-sync/transport/${sessionId}`),
    useSharedConnection: true,
  });
  const sessionStore = await SessionStore.create(
    new KVStore(`qr-sync/session-store/${sessionId}`),
  );
  const client = new WalletClient({
    transport,
    sessionstore: sessionStore,
    keymanager: keyManager,
  });

  return { sessionId, client };
}
