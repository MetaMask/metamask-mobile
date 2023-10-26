import { KeyringController } from '@metamask/keyring-controller';
import { AndroidClient } from '../AndroidSDK/android-sdk-types';
import RPCQueueManager from '../RPCQueueManager';
import { SDKConnect } from '../SDKConnect';
import DevLogger from './DevLogger';
import { Connection } from '../Connection';

export const MAX_QUEUE_LOOP = Infinity;
export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForReadyClient = async (
  id: string,
  connectedClients: {
    [clientId: string]: AndroidClient;
  },
) => {
  let i = 0;
  while (!connectedClients[id]) {
    i += 1;
    if (i++ > MAX_QUEUE_LOOP) {
      console.warn(`RPC queue not empty after ${MAX_QUEUE_LOOP} seconds`);
      break;
    }
    await wait(1000);
  }
};

export const waitForConnectionReadiness = async ({
  connection,
}: {
  connection: Connection;
}) => {
  let i = 0;
  while (!connection.isReady) {
    i += 1;
    if (i > MAX_QUEUE_LOOP) {
      throw new Error('Connection timeout - ready state not received');
    }
    await wait(1000);
  }
};

export const waitForKeychainUnlocked = async ({
  context,
  keyringController,
}: {
  keyringController: KeyringController;
  context?: string;
}) => {
  let i = 1;
  if (!keyringController) {
    console.warn('Keyring controller not found');
  }

  // Disable during e2e tests otherwise Detox fails
  if (process.env.IS_TEST === 'true') {
    return true;
  }

  let unlocked = keyringController.isUnlocked();
  DevLogger.log(
    `SDKConnect:: waitForKeyChainUnlocked[${context}] unlocked: ${unlocked}`,
  );
  while (!unlocked) {
    await wait(1000);
    if (i % 60 === 0) {
      console.warn(
        `SDKConnect [${context}] Waiting for keychain unlock... attempt ${i}`,
      );
    }
    unlocked = keyringController.isUnlocked();
    i += 1;
  }

  return unlocked;
};

export const waitForAndroidServiceBinding = async () => {
  let i = 1;
  while (SDKConnect.getInstance().isAndroidSDKBound() === false) {
    await wait(500);
    i += 1;
    if (i > 5 && i % 10 === 0) {
      console.warn(`Waiting for Android service binding...`);
    }
  }
};

export const waitForEmptyRPCQueue = async (manager: RPCQueueManager) => {
  let i = 0;
  let queue = Object.keys(manager.get());
  while (queue.length > 0) {
    queue = Object.keys(manager.get());
    if (i++ > MAX_QUEUE_LOOP) {
      console.warn(`RPC queue not empty after ${MAX_QUEUE_LOOP} seconds`);
      break;
    }
    await wait(1000);
  }
};
