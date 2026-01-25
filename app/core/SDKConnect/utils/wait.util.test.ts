import { KeyringController } from '@metamask/keyring-controller';
import { DappClient } from '../dapp-sdk-types';
import { Connection } from '../Connection';
import RPCQueueManager from '../RPCQueueManager';
import { SDKConnect } from '../SDKConnect';
import {
  waitForAndroidServiceBinding,
  waitForAsyncCondition,
  waitForCondition,
  waitForConnectionReadiness,
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
  waitForReadyClient,
  waitForUserLoggedIn,
} from './wait.util';

jest.mock('../../../../app/store/index', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../SDKConnect', () => ({
  SDKConnect: {
    getInstance: jest.fn(),
  },
}));

// Mock the entire wait.util module
jest.mock('./wait.util', () => {
  const originalModule = jest.requireActual('./wait.util');
  return {
    ...originalModule,
    wait: (_ms: number) => new Promise((resolve) => setTimeout(resolve, 10)),
    waitForUserLoggedIn: jest.fn().mockResolvedValue(true),
  };
});

describe('wait.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  test('waitForReadyClient resolves when client is ready', async () => {
    const connectedClients: { [clientId: string]: DappClient } = {};
    const clientId = 'testClient';

    const waitPromise = waitForReadyClient(clientId, connectedClients, 10);
    connectedClients[clientId] = {} as DappClient;

    await jest.runAllTimersAsync();
    await waitPromise;

    expect(connectedClients[clientId]).toBeDefined();
  });

  test('waitForCondition resolves when condition is true', async () => {
    let flag = false;
    const waitPromise = waitForCondition({ fn: () => flag, waitTime: 10 });

    flag = true;
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(flag).toBe(true);
  });

  test('waitForAsyncCondition resolves when async condition is true', async () => {
    let flag = false;
    const waitPromise = waitForAsyncCondition({
      fn: async () => flag,
      waitTime: 10,
    });

    flag = true;
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(flag).toBe(true);
  });

  test('waitForConnectionReadiness resolves when connection is ready', async () => {
    const connection = { isReady: false } as Connection;
    const waitPromise = waitForConnectionReadiness({
      connection,
      waitTime: 10,
    });

    connection.isReady = true;
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(connection.isReady).toBe(true);
  });

  test('waitForKeychainUnlocked resolves when keychain is unlocked', async () => {
    const keyringController = {
      isUnlocked: jest.fn().mockReturnValue(false),
    } as unknown as KeyringController;

    const waitPromise = waitForKeychainUnlocked({
      keyringController,
      waitTime: 10,
    });

    keyringController.isUnlocked = jest.fn().mockReturnValue(true);
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(keyringController.isUnlocked()).toBe(true);
  });

  test('waitForUserLoggedIn resolves when user is logged in', async () => {
    const result = await waitForUserLoggedIn({ waitTime: 10 });
    expect(result).toBe(true);
    expect(waitForUserLoggedIn).toHaveBeenCalledWith({ waitTime: 10 });
  });

  test('waitForAndroidServiceBinding resolves when Android service is bound', async () => {
    const mockSDKConnect = {
      isAndroidSDKBound: jest.fn().mockReturnValue(false),
    };
    (SDKConnect.getInstance as jest.Mock).mockReturnValue(mockSDKConnect);

    const waitPromise = waitForAndroidServiceBinding(10);

    mockSDKConnect.isAndroidSDKBound.mockReturnValue(true);
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(mockSDKConnect.isAndroidSDKBound()).toBe(true);
  });

  test('waitForEmptyRPCQueue resolves when RPC queue is empty', async () => {
    const manager = {
      get: jest.fn().mockReturnValue({ task1: {}, task2: {} }),
    } as unknown as RPCQueueManager;

    const waitPromise = waitForEmptyRPCQueue(manager, 10);

    manager.get = jest.fn().mockReturnValue({});
    await jest.runAllTimersAsync();
    await waitPromise;

    expect(Object.keys(manager.get()).length).toBe(0);
  });
});
