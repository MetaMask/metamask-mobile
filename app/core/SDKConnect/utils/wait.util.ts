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

export const waitForEmptyRPCQueue = async (manager: RPCQueueManager) => {
  let i = 0;
  let queue = Object.keys(manager.get());
  while (queue.length > 0) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    queue = Object.keys(manager.get());
    if (i++ > 30) {
      break;
    }
  }
};
