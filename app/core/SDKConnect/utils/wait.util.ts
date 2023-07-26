import { KeyringController } from '@metamask/keyring-controller';
import RPCQueueManager from '../RPCQueueManager';
import { AndroidClient } from '../AndroidSDK/android-sdk-types';

const MAX_QUEUE_LOOP = 50; // 50 seconds

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

export const waitForKeychainUnlocked = async ({
  keyringController,
}: {
  keyringController: KeyringController;
}) => {
  let i = 0;
  while (!keyringController.isUnlocked()) {
    await new Promise<void>((res) => setTimeout(() => res(), 600));
    if (i++ > 60) break;
  }
};

const MAX_QUEUE_LOOP = 50; // 50 seconds
export const waitForEmptyRPCQueue = async (manager: RPCQueueManager) => {
  let i = 0;
  let queue = Object.keys(manager.get());
  while (queue.length > 0) {
    queue = Object.keys(manager.get());
    console.log(`RPC queue not empty [${queue.length}], waiting...`, queue);
    if (i++ > MAX_QUEUE_LOOP) {
      console.warn(`RPC queue not empty after ${MAX_QUEUE_LOOP} seconds`);
      break;
    }
    await wait(1000);
  }
};
