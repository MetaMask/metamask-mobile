import { KeyringController } from '@metamask/keyring-controller';
import RPCQueueManager from '../RPCQueueManager';

export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const MAX_QUEUE_LOOP = 50;
export const waitForEmptyRPCQueue = async (manager: RPCQueueManager) => {
  let i = 0;
  let queue = Object.keys(manager.get());
  while (queue.length > 0) {
    queue = Object.keys(manager.get());
    if (i++ > MAX_QUEUE_LOOP) {
      break;
    }
    await wait(1000);
  }
};
