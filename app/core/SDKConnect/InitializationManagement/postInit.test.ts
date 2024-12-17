import postInit from './postInit';
import SDKConnect from '../SDKConnect';
import { KeyringController } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { AppState } from 'react-native';
import DevLogger from '../utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from '../utils/wait.util';

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      isUnlocked: jest.fn(),
    },
  },
}));
jest.mock('react-native');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');

describe('postInit', () => {
  let mockInstance = {} as unknown as SDKConnect;

  const mockHandleAppState = jest.fn();
  const mockReconnectAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        _initialized: true,
        _postInitializing: false,
        _postInitialized: false,
        appStateListener: undefined,
      },
      _handleAppState: mockHandleAppState,
      reconnectAll: mockReconnectAll,
    } as unknown as SDKConnect;
  });

  it('should throw an error if not initialized', async () => {
    mockInstance.state._initialized = false;

    await expect(postInit(mockInstance)).rejects.toThrow(
      'SDKConnect::postInit() - not initialized',
    );
  });

  it('should log and wait for completion if already doing post initialization', async () => {
    mockInstance.state._postInitializing = true;

    await postInit(mockInstance);

    expect(mockInstance.state._postInitializing).toBe(true);
    expect(mockInstance.state._postInitialized).toBe(false);
    expect(mockInstance.state.appStateListener).toBeUndefined();
    expect(waitForKeychainUnlocked).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
    expect(mockReconnectAll).not.toHaveBeenCalled();
    expect(DevLogger.log).toHaveBeenCalledWith(
      `SDKConnect::postInit() -- already doing post init -- wait for completion`,
    );
    expect(waitForCondition).toHaveBeenCalledWith({
      fn: expect.any(Function),
      context: 'post_init',
    });
    expect(DevLogger.log).toHaveBeenCalledWith(
      `SDKConnect::postInit() -- done waiting for post initialization`,
    );
  });

  it('should skip post initialization if already post initialized', async () => {
    mockInstance.state._postInitialized = true;

    await postInit(mockInstance);

    expect(mockInstance.state._postInitializing).toBe(false);
    expect(mockInstance.state._postInitialized).toBe(true);
    expect(mockInstance.state.appStateListener).toBeUndefined();
    expect(waitForKeychainUnlocked).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
    expect(mockReconnectAll).not.toHaveBeenCalled();
    expect(DevLogger.log).toHaveBeenCalledWith(
      `SDKConnect::postInit() -- SKIP -- already post initialized`,
    );
  });

  describe('Post initialization process', () => {
    it('should set the post initializing state', async () => {
      await postInit(mockInstance);

      expect(mockInstance.state._postInitializing).toBe(true);
    });

    it('should check if the keychain is unlocked', async () => {
      await postInit(mockInstance);

      expect(
        (Engine.context as { KeyringController: KeyringController })
          .KeyringController.isUnlocked,
      ).toHaveBeenCalled();
    });

    it('should wait for the keychain to be unlocked', async () => {
      await postInit(mockInstance);

      expect(waitForKeychainUnlocked).toHaveBeenCalledWith({
        keyringController: (
          Engine.context as {
            KeyringController: KeyringController;
          }
        ).KeyringController,
        context: 'init',
      });
    });

    it('should set up the app state listener', async () => {
      await postInit(mockInstance);

      expect(AppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
    });

    it('should reconnect all sessions', async () => {
      await postInit(mockInstance);

      expect(mockReconnectAll).toHaveBeenCalled();
    });

    it('should set the post initialized state', async () => {
      await postInit(mockInstance);

      expect(mockInstance.state._postInitialized).toBe(true);
    });

    it('should log the completion of post initialization', async () => {
      await postInit(mockInstance);

      expect(DevLogger.log).toHaveBeenCalledWith(
        `SDKConnect::postInit() - done`,
      );
    });
  });
});
