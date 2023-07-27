import { KeyringController } from '@metamask/keyring-controller';
import { AndroidClient } from '../AndroidSDK/android-sdk-types';
import RPCQueueManager from '../RPCQueueManager';
import { SDKConnect } from '../SDKConnect';

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

export const waitForAndroidServiceBinding = async () => {
  let i = 1;
  while (SDKConnect.getInstance().isAndroidSDKBinded() === false) {
    await wait(500);
    i += 1;
    if (i > 5 && i % 10 === 0) {
      console.warn(`Waiting for Android service binding... ${i}s`);
    }
  }
};

export const waitForEmptyRPCQueue = async (manager: RPCQueueManager) => {
  let i = 0;
  let queue = Object.keys(manager.get());
  while (queue.length > 0) {
    queue = Object.keys(manager.get());

    // print the queue every 5 seconds
    if (i % 5 === 0) {
      console.warn(`RPC queue not empty after ${i}s`, queue);
    }

    if (i++ > MAX_QUEUE_LOOP) {
      console.warn(`RPC queue not empty after ${MAX_QUEUE_LOOP} seconds`);
      break;
    }
    await wait(1000);
  }
};
