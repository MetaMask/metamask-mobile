import { KeyringController } from '@metamask/keyring-controller';
import { DappClient } from '../AndroidSDK/dapp-sdk-types';
import RPCQueueManager from '../RPCQueueManager';
import DevLogger from './DevLogger';
import { Connection } from '../Connection';

export const waitForReadyClient = async (
  id: string,
  connectedClients: {
    [clientId: string]: DappClient;
  },
  waitTime = 200,
) => {
  DevLogger.log(`[MOCK] waitForReadyClient returning true for 
    id=${id} 
    connectedClients=${connectedClients} 
    waitTime=${waitTime}`);
  return true;
};

export const waitForCondition = async ({
  fn,
  context,
  waitTime = 1000,
}: {
  fn: () => boolean;
  waitTime?: number;
  context?: string;
}) => {
  DevLogger.log(`[MOCK] waitForCondition returning true for 
    fn=${fn} 
    context=${context} 
    waitTime=${waitTime}`);
  return true;
};

/**
 * Similar to `waitForCondition`, but for asynchronous conditions that return a promise.
 */
export const waitForAsyncCondition = async ({
  fn,
  context,
  waitTime = 1000,
}: {
  fn: () => Promise<boolean>;
  waitTime?: number;
  context?: string;
}) => {
  DevLogger.log(`[MOCK] waitForAsyncCondition returning true for 
    fn=${fn} 
    context=${context} 
    waitTime=${waitTime}`);
  return true;
};

export const waitForConnectionReadiness = async ({
  connection,
  waitTime = 1000,
}: {
  connection: Connection;
  waitTime?: number;
}) => {
  DevLogger.log(`[MOCK] waitForConnectionReadiness returning true for 
    connection=${connection} 
    waitTime=${waitTime}`);
  return true;
};

export const waitForKeychainUnlocked = async ({
  context,
  keyringController,
  waitTime = 1000,
}: {
  keyringController: KeyringController;
  context?: string;
  waitTime?: number;
}) => {
  DevLogger.log(`[MOCK] waitForKeychainUnlocked returning true for 
    context=${context} 
    keyringController=${keyringController} 
    waitTime=${waitTime}`);
  return true;
};

export const waitForUserLoggedIn = async ({
  context,
  waitTime = 1000,
}: {
  waitTime?: number;
  context?: string;
}) => {
  DevLogger.log(`[MOCK] waitForUserLoggedIn returning true for 
    context=${context} 
    waitTime=${waitTime}`);
  return true;
};

export const waitForAndroidServiceBinding = async (waitTime = 500) => {
  DevLogger.log(`[MOCK] waitForAndroidServiceBinding returning true for 
    waitTime=${waitTime}`);
  return true;
};

export const waitForEmptyRPCQueue = async (
  manager: RPCQueueManager,
  waitTime = 1000,
) => {
  DevLogger.log(`[MOCK] waitForEmptyRPCQueue returning true for 
    manager=${manager} 
    waitTime=${waitTime}`);
  return true;
};
