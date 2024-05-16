import { KeyringController } from '@metamask/keyring-controller';
import { DappClient } from '../AndroidSDK/dapp-sdk-types';
import RPCQueueManager from '../RPCQueueManager';
import { SDKConnect } from '../SDKConnect';
import DevLogger from './DevLogger';
import { Connection } from '../Connection';
import { isE2E } from '../../../util/test/utils';
import { store } from '../../../../app/store/index';

export const MAX_QUEUE_LOOP = Infinity;
export const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForReadyClient = async (
  id: string,
  connectedClients: {
    [clientId: string]: DappClient;
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

/**
 * Asynchronously waits for a given condition to return true by periodically executing
 * a provided function. This can be useful for delaying subsequent code execution until
 * a certain condition is met, such as waiting for a resource to become available.
 *
 * @param {Object} params - Configuration object for the wait condition.
 * @param {Function} params.fn - A function that returns a boolean, indicating whether the desired condition is met.
 * This function is polled repeatedly until it returns true.
 * @param {number} [params.waitTime=1000] - The time to wait between each poll of `fn`, in milliseconds.
 * Defaults to 1000ms (1 second) if not specified.
 * @param {string} [params.context] - Optional context information to be used in logging messages.
 * If provided, it will be included in log outputs for diagnostic purposes, particularly when the
 * function has been polled more than 5 times and on every tenth poll thereafter without the condition being met.
 */
export const waitForCondition = async ({
  fn,
  context,
  waitTime = 1000,
}: {
  fn: () => boolean;
  waitTime?: number;
  context?: string;
}) => {
  let i = 0;
  while (!fn()) {
    i += 1;
    if (i > 5 && i % 10 === 0) {
      DevLogger.log(`Waiting for fn context=${context} to return true`);
    }
    await wait(waitTime);
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
  // Disable during e2e tests otherwise Detox fails
  if (isE2E) {
    return true;
  }

  let i = 1;
  if (!keyringController) {
    console.warn('Keyring controller not found');
  }

  let unlocked = keyringController.isUnlocked();
  DevLogger.log(
    `wait:: waitForKeyChainUnlocked[${context}] unlocked: ${unlocked}`,
  );
  while (!unlocked) {
    await wait(1000);
    if (i % 5 === 0) {
      DevLogger.log(
        `SDKConnect [${context}] Waiting for keychain unlock... attempt ${i}`,
      );
    }
    unlocked = keyringController.isUnlocked();
    i += 1;
  }

  return unlocked;
};

export const waitForUserLoggedIn = async ({
  context,
}: {
  context?: string;
}) => {
  let i = 1;

  // Disable during e2e tests otherwise Detox fails
  if (isE2E) {
    return true;
  }

  const state = store.getState();
  let isLoggedIn = state.user.isLoggedIn ?? false;

  DevLogger.log(
    `wait:: waitForUserLoggedIn[${context}] isLoggedIn: ${isLoggedIn}`,
  );
  while (!isLoggedIn) {
    await wait(1000);
    if (i % 60 === 0) {
      DevLogger.log(
        `[wait.util] [${context}] Waiting for userLoggedIn... attempt ${i}`,
      );
    }
    isLoggedIn = state.user.isLoggedIn ?? false;
    i += 1;
  }

  return isLoggedIn;
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
