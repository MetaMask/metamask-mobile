/* eslint-disable @typescript-eslint/no-explicit-any */
import Engine from '../../Engine';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { ConnectionInfo } from '../types/connection-info';
import { RPCBridgeAdapter } from './rpc-bridge-adapter';
import { whenEngineReady } from '../utils/when-engine-ready';
import { whenOnboardingComplete } from '../utils/when-onboarding-complete';
import { whenStoreReady } from '../utils/when-store-ready';

jest.mock('../../BackgroundBridge/BackgroundBridge');
jest.mock('../utils/when-engine-ready', () => ({
  whenEngineReady: jest.fn(),
}));
jest.mock('../utils/when-onboarding-complete', () => ({
  whenOnboardingComplete: jest.fn(),
}));
jest.mock('../utils/when-store-ready', () => ({
  whenStoreReady: jest.fn(),
}));
jest.mock('../../Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    tryUnsubscribe: jest.fn(),
  },
  context: {
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(true),
    },
  },
}));

const MockedBackgroundBridge = BackgroundBridge as any;
const mockedWhenEngineReady = whenEngineReady as jest.Mock;
const mockedWhenOnboardingComplete = whenOnboardingComplete as jest.Mock;
const mockedWhenStoreReady = whenStoreReady as jest.Mock;
const mockedEngine = Engine as any;

describe('RPCBridgeAdapter', () => {
  let adapter: RPCBridgeAdapter;
  let mockConnection: ConnectionInfo;
  let mockMessenger: any;
  let onUnlockCallback: () => void;
  let backgroundBridgeInstance: any;
  let sendMessageCallback: (response: unknown) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      id: 'mock-connection-id',
      metadata: {
        dapp: { name: 'MockDApp', url: 'https://mockdapp.com' },
        sdk: { version: '1.0', platform: 'mobile' },
      },
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
    };

    mockMessenger = {
      subscribe: jest.fn((eventName, callback) => {
        if (eventName === 'KeyringController:unlock') {
          onUnlockCallback = callback;
        }
      }),
      tryUnsubscribe: jest.fn(),
    };

    mockedEngine.controllerMessenger = mockMessenger;
    mockedWhenEngineReady.mockResolvedValue(undefined);
    mockedWhenOnboardingComplete.mockResolvedValue(undefined);
    mockedWhenStoreReady.mockResolvedValue(undefined);

    // Capture the instance and sendMessage callback from the mock constructor
    MockedBackgroundBridge.mockImplementation((args: any) => {
      sendMessageCallback = args.sendMessage;
      backgroundBridgeInstance = {
        onMessage: jest.fn(),
        onDisconnect: jest.fn(),
      };
      return backgroundBridgeInstance;
    });

    adapter = new RPCBridgeAdapter(mockConnection);
  });

  describe('Initialization', () => {
    it('should initialize lazily on first send, wait for engine, and create a client', async () => {
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      const request = {
        name: 'metamask-multichain-provider',
        data: { jsonrpc: '2.0', method: 'eth_accounts' },
      };

      adapter.send(request);
      // Wait for all async operations to complete
      await new Promise(process.nextTick);

      expect(mockedWhenEngineReady).toHaveBeenCalledTimes(1);
      expect(mockedWhenOnboardingComplete).toHaveBeenCalledTimes(1);
      expect(mockedWhenStoreReady).toHaveBeenCalledTimes(1);
      expect(mockMessenger.subscribe).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
      );
      expect(MockedBackgroundBridge).toHaveBeenCalledTimes(1);
      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledWith(request);
    });

    it('should be idempotent and initialize only once', async () => {
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);

      adapter.send({
        name: 'metamask-multichain-provider',
        data: { method: 'test1' },
      });
      adapter.send({
        name: 'metamask-multichain-provider',
        data: { method: 'test2' },
      });
      // Wait for all async operations to complete
      await new Promise(process.nextTick);

      expect(mockedWhenEngineReady).toHaveBeenCalledTimes(1);
      expect(mockedWhenOnboardingComplete).toHaveBeenCalledTimes(1);
      expect(mockedWhenStoreReady).toHaveBeenCalledTimes(1);
      expect(mockMessenger.subscribe).toHaveBeenCalledTimes(1);
      expect(MockedBackgroundBridge).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Queuing and Processing', () => {
    it('should queue requests when the wallet is locked', async () => {
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(false);
      const request = {
        name: 'metamask-multichain-provider',
        data: { method: 'test_locked' },
      };

      adapter.send(request);
      // Wait for all async operations to complete
      await new Promise(process.nextTick);

      expect(backgroundBridgeInstance).not.toBeNull();
      expect(backgroundBridgeInstance.onMessage).not.toHaveBeenCalled();
    });

    it('should process the queue when the wallet is unlocked', async () => {
      // Start locked
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(false);
      const request1 = {
        name: 'metamask-multichain-provider',
        data: { method: 'test_queued1' },
      };
      const request2 = {
        name: 'metamask-multichain-provider',
        data: { method: 'test_queued2' },
      };

      adapter.send(request1);
      adapter.send(request2);
      // Wait for initialization
      await new Promise(process.nextTick);

      expect(backgroundBridgeInstance.onMessage).not.toHaveBeenCalled();

      // Unlock
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      onUnlockCallback(); // Simulate unlock event
      // Wait for queue processing
      await new Promise(process.nextTick);

      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledTimes(2);
      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledWith(request1);
      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledWith(request2);
    });

    it('should process requests immediately if already unlocked', async () => {
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      const request = {
        name: 'metamask-multichain-provider',
        data: { method: 'test_unlocked' },
      };

      adapter.send(request);
      // Wait for all async operations to complete
      await new Promise(process.nextTick);

      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledWith(request);
    });
  });

  describe('Response Handling', () => {
    it('should emit a response event when the client sends a message back', async () => {
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      const responseSpy = jest.fn();
      adapter.on('response', responseSpy);

      // Trigger initialization
      adapter.send({ method: 'init' });
      // Wait for all async operations to complete
      await new Promise(process.nextTick);

      const mockResponse = { id: 1, result: '0x1' };
      sendMessageCallback(mockResponse); // Simulate response from BackgroundBridge

      expect(responseSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Disposal', () => {
    it('should clean up resources on dispose', async () => {
      // Initialize first
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      adapter.send({ method: 'init' });
      // Wait for initialization
      await new Promise(process.nextTick);

      // Add another item to the queue to test if it gets cleared
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(false);
      adapter.send({
        name: 'metamask-multichain-provider',
        data: { method: 'test_dispose' },
      });

      adapter.dispose();

      expect(mockMessenger.tryUnsubscribe).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
      );
      expect(backgroundBridgeInstance.onDisconnect).toHaveBeenCalledTimes(1);

      // Try processing the queue again to see if it's empty
      mockedEngine.context.KeyringController.isUnlocked.mockReturnValue(true);
      onUnlockCallback();
      // Wait for any potential queue processing
      await new Promise(process.nextTick);
      // onMessage was called once for 'init', should not be called again
      expect(backgroundBridgeInstance.onMessage).toHaveBeenCalledTimes(1);
    });
  });
});
