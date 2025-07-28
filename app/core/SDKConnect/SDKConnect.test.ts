import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import AppConstants from '../AppConstants';
import addDappConnection from './AndroidSDK/addDappConnection';
import bindAndroidSDK from './AndroidSDK/bindAndroidSDK';
import loadDappConnections from './AndroidSDK/loadDappConnections';
import { Connection, ConnectionProps } from './Connection';
import {
  approveHost,
  connectToChannel,
  disapproveChannel,
  invalidateChannel,
  reconnect,
  reconnectAll,
  removeAll,
  removeChannel,
  watchConnection,
} from './ConnectionManagement';
import { init, postInit } from './InitializationManagement';
import {
  ApprovedHosts,
  ConnectedSessions,
  SDKConnect,
  SDKSessions,
  approveHostProps,
} from './SDKConnect';
import { DEFAULT_SESSION_TIMEOUT_MS } from './SDKConnectConstants';
import { pause, resume, unmount } from './SessionManagement';
import {
  handleAppState,
  hideLoadingState,
  updateOriginatorInfos,
  updateSDKLoadingState,
} from './StateManagement';
import Engine from '../../core/Engine';

const mockNavigation = {
  getCurrentRoute: jest.fn().mockReturnValue({ name: 'Home' }),
  navigate: jest.fn(),
};

jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return mockNavigation;
    },
    set navigation(value) {
      // Mock setter - does nothing but prevents errors
    },
  },
}));

jest.mock('./Connection');
jest.mock('@react-navigation/native');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('./AndroidSDK/AndroidService');
jest.mock('./AndroidSDK/addDappConnection');
jest.mock('./AndroidSDK/bindAndroidSDK');
jest.mock('./AndroidSDK/loadDappConnections');
jest.mock('./ConnectionManagement');
jest.mock('./InitializationManagement');
jest.mock('./RPCQueueManager');
jest.mock('./SDKConnectConstants');
jest.mock('./SessionManagement');
jest.mock('./StateManagement');

describe('SDKConnect', () => {
  let sdkConnect: SDKConnect;

  const mockHandleAppState = handleAppState as jest.MockedFunction<
    typeof handleAppState
  >;

  const mockHideLoadingState = hideLoadingState as jest.MockedFunction<
    typeof hideLoadingState
  >;

  const mockUpdateOriginatorInfos =
    updateOriginatorInfos as jest.MockedFunction<typeof updateOriginatorInfos>;

  const mockUpdateSDKLoadingState =
    updateSDKLoadingState as jest.MockedFunction<typeof updateSDKLoadingState>;

  const mockInit = init as jest.MockedFunction<typeof init>;

  const mockPostInit = postInit as jest.MockedFunction<typeof postInit>;

  const mockPause = pause as jest.MockedFunction<typeof pause>;

  const mockResume = resume as jest.MockedFunction<typeof resume>;

  const mockUnmount = unmount as jest.MockedFunction<typeof unmount>;

  const mockConnectToChannel = connectToChannel as jest.MockedFunction<
    typeof connectToChannel
  >;

  const mockWatchConnection = watchConnection as jest.MockedFunction<
    typeof watchConnection
  >;

  const mockReconnect = reconnect as jest.MockedFunction<typeof reconnect>;

  const mockReconnectAll = reconnectAll as jest.MockedFunction<
    typeof reconnectAll
  >;

  const mockRemoveChannel = removeChannel as jest.MockedFunction<
    typeof removeChannel
  >;

  const mockRemoveAll = removeAll as jest.MockedFunction<typeof removeAll>;
  mockRemoveAll.mockResolvedValue(true);

  const mockInvalidateChannel = invalidateChannel as jest.MockedFunction<
    typeof invalidateChannel
  >;

  const mockApproveHost = approveHost as jest.MockedFunction<
    typeof approveHost
  >;

  const mockDisapproveChannel = disapproveChannel as jest.MockedFunction<
    typeof disapproveChannel
  >;

  const mockBindAndroidSDK = bindAndroidSDK as jest.MockedFunction<
    typeof bindAndroidSDK
  >;

  const mockLoadDappConnections = loadDappConnections as jest.MockedFunction<
    typeof loadDappConnections
  >;

  const mockAddDappConnection = addDappConnection as jest.MockedFunction<
    typeof addDappConnection
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    sdkConnect = SDKConnect.getInstance();
    // Reset SDK state for test isolation
    sdkConnect.state._initialized = false;
    sdkConnect.state._initializing = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization Management', () => {
    describe('init', () => {
      it('should initialize the SDKConnect instance', async () => {
        await SDKConnect.init({
          context: 'testContext',
        });

        expect(mockInit).toHaveBeenCalledTimes(1);
        expect(mockInit).toHaveBeenCalledWith({
          navigation: mockNavigation,
          context: 'testContext',
          instance: sdkConnect,
        });
      });
    });

    describe('postInit', () => {
      it('should perform post-initialization tasks', async () => {
        await sdkConnect.postInit();

        expect(mockPostInit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Connection Management', () => {
    describe('connectToChannel', () => {
      it('should establish a connection to a specified channel', async () => {
        const validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;
        const id = 'testId';
        const trigger = 'deeplink';
        const otherPublicKey = 'testOtherPublicKey';
        const origin = 'testOrigin';

        await sdkConnect.connectToChannel({
          id,
          trigger,
          otherPublicKey,
          origin,
          validUntil,
        });

        expect(mockConnectToChannel).toHaveBeenCalledTimes(1);
        expect(mockConnectToChannel).toHaveBeenCalledWith({
          id,
          trigger,
          otherPublicKey,
          origin,
          validUntil,
          instance: sdkConnect,
        });
      });
    });

    describe('watchConnection', () => {
      it('should watch a specified connection for events', () => {
        const testConnection = {} as Connection;

        sdkConnect.watchConnection(testConnection);

        expect(mockWatchConnection).toHaveBeenCalledTimes(1);
        expect(mockWatchConnection).toHaveBeenCalledWith(
          testConnection,
          sdkConnect,
        );
      });
    });

    describe('reconnect', () => {
      it('should reconnect to a specified channel', async () => {
        const channelId = 'testChannelId';
        const otherPublicKey = 'testOtherPublicKey';
        const initialConnection = true;
        const trigger = 'deeplink';
        const updateKey = true;
        const context = 'testContext';

        await sdkConnect.reconnect({
          channelId,
          otherPublicKey,
          initialConnection,
          trigger,
          updateKey,
          context,
        });

        expect(mockReconnect).toHaveBeenCalledTimes(1);
        expect(mockReconnect).toHaveBeenCalledWith({
          channelId,
          otherPublicKey,
          initialConnection,
          trigger,
          updateKey,
          context,
          instance: sdkConnect,
        });
      });
    });

    describe('reconnectAll', () => {
      it('should reconnect all channels', async () => {
        await sdkConnect.reconnectAll();

        expect(mockReconnectAll).toHaveBeenCalledTimes(1);
        expect(mockReconnectAll).toHaveBeenCalledWith(sdkConnect);
      });
    });

    describe('removeChannel', () => {
      it('should remove a specified channel', async () => {
        const channelId = 'testChannelId';

        await sdkConnect.removeChannel({ channelId });

        expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
        expect(mockRemoveChannel).toHaveBeenCalledWith({
          channelId,
          engine: Engine,
          instance: sdkConnect,
        });
      });
    });

    describe('removeAll', () => {
      it('should remove all channels', async () => {
        await sdkConnect.removeAll();

        expect(mockRemoveAll).toHaveBeenCalledTimes(1);
        expect(mockRemoveAll).toHaveBeenCalledWith(sdkConnect);
      });
    });

    describe('invalidateChannel', () => {
      it('should invalidate a specified channel', () => {
        const channelId = 'testChannelId';

        sdkConnect.invalidateChannel({ channelId });

        expect(mockInvalidateChannel).toHaveBeenCalledTimes(1);
        expect(mockInvalidateChannel).toHaveBeenCalledWith({
          channelId,
          instance: sdkConnect,
        });
      });
    });

    describe('approveHost', () => {
      it('should approve a specified host', () => {
        const host = 'testHost';

        sdkConnect._approveHost({ host } as approveHostProps);

        expect(mockApproveHost).toHaveBeenCalledTimes(1);
        expect(mockApproveHost).toHaveBeenCalledWith({
          host,
          instance: sdkConnect,
        });
      });
    });

    describe('disapproveChannel', () => {
      it('should disapprove a specified channel', () => {
        const channelId = 'testChannelId';

        sdkConnect.disapproveChannel(channelId);

        expect(mockDisapproveChannel).toHaveBeenCalledTimes(1);
        expect(mockDisapproveChannel).toHaveBeenCalledWith({
          channelId,
          instance: sdkConnect,
        });
      });
    });
  });

  describe('Android SDK Management', () => {
    describe('bindAndroidSDK', () => {
      it('should bind the Android SDK', async () => {
        await sdkConnect.bindAndroidSDK();

        expect(mockBindAndroidSDK).toHaveBeenCalledTimes(1);
        expect(mockBindAndroidSDK).toHaveBeenCalledWith(sdkConnect);
      });
    });

    describe('loadDappConnections', () => {
      it('should load Android connections', async () => {
        await sdkConnect.loadDappConnections();

        expect(mockLoadDappConnections).toHaveBeenCalledTimes(1);
        expect(mockLoadDappConnections).toHaveBeenCalledWith();
      });
    });

    describe('addDappConnection', () => {
      it('should add an Android connection', async () => {
        const testConnection = {} as ConnectionProps;

        await sdkConnect.addDappConnection(testConnection);

        expect(mockAddDappConnection).toHaveBeenCalledTimes(1);
        expect(mockAddDappConnection).toHaveBeenCalledWith(
          testConnection,
          sdkConnect,
        );
      });
    });
  });

  describe('Session Management', () => {
    describe('pause', () => {
      it('should pause the SDK', () => {
        sdkConnect.pause();

        expect(mockPause).toHaveBeenCalledTimes(1);
        expect(mockPause).toHaveBeenCalledWith(sdkConnect);
      });
    });

    describe('resume', () => {
      it('should resume the SDK', async () => {
        const channelId = 'testChannelId';
        const instance = sdkConnect;

        await sdkConnect.resume({ channelId });

        expect(mockResume).toHaveBeenCalledTimes(1);
        expect(mockResume).toHaveBeenCalledWith({ channelId, instance });
      });
    });

    describe('unmount', () => {
      it('should unmount the SDK', async () => {
        await sdkConnect.unmount();

        expect(mockUnmount).toHaveBeenCalledTimes(1);
        expect(mockUnmount).toHaveBeenCalledWith(sdkConnect);
      });
    });
  });

  describe('State Management', () => {
    describe('handleAppState', () => {
      it('should handle app state changes', async () => {
        const nextAppState = 'active';

        await sdkConnect._handleAppState(nextAppState);

        expect(mockHandleAppState).toHaveBeenCalledTimes(1);
        expect(mockHandleAppState).toHaveBeenCalledWith({
          appState: nextAppState,
          instance: sdkConnect,
        });
      });
    });

    describe('hideLoadingState', () => {
      it('should hide the loading state', async () => {
        await sdkConnect.hideLoadingState();

        expect(mockHideLoadingState).toHaveBeenCalledTimes(1);
        expect(mockHideLoadingState).toHaveBeenCalledWith({
          instance: sdkConnect,
        });
      });
    });

    describe('updateOriginatorInfos', () => {
      it('should update originator information', () => {
        const channelId = 'testChannelId';
        const originatorInfo = {} as OriginatorInfo;

        sdkConnect.updateOriginatorInfos({ channelId, originatorInfo });

        expect(mockUpdateOriginatorInfos).toHaveBeenCalledTimes(1);
        expect(mockUpdateOriginatorInfos).toHaveBeenCalledWith({
          channelId,
          originatorInfo,
          instance: sdkConnect,
        });
      });
    });

    describe('updateSDKLoadingState', () => {
      it('should update the SDK loading state', async () => {
        const channelId = 'testChannelId';
        const loading = true;

        await sdkConnect.updateSDKLoadingState({ channelId, loading });

        expect(mockUpdateSDKLoadingState).toHaveBeenCalledTimes(1);
        expect(mockUpdateSDKLoadingState).toHaveBeenCalledWith({
          channelId,
          loading,
          instance: sdkConnect,
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getConnected', () => {
      it('should retrieve connected sessions', () => {
        const testConnectedSessions = {} as ConnectedSessions;
        sdkConnect.state.connected = testConnectedSessions;

        expect(sdkConnect.getConnected()).toEqual(testConnectedSessions);
      });
    });

    describe('getConnections', () => {
      it('should retrieve all SDK sessions', () => {
        const testSDKSessions = {} as SDKSessions;
        sdkConnect.state.connections = testSDKSessions;

        expect(sdkConnect.getConnections()).toEqual(testSDKSessions);
      });
    });

    describe('getApprovedHosts', () => {
      it('should retrieve approved hosts', () => {
        const testApprovedHosts = {} as ApprovedHosts;
        sdkConnect.state.approvedHosts = testApprovedHosts;

        expect(sdkConnect.getApprovedHosts()).toEqual(testApprovedHosts);
      });
    });

    describe('setSocketServerUrl', () => {
      it('should set the socket server URL', async () => {
        const testUrl = 'testUrl';

        await sdkConnect.setSocketServerUrl(testUrl);

        expect(sdkConnect.state.socketServerUrl).toEqual(testUrl);
      });
    });

    describe('isApproved', () => {
      it('should check if a channel is approved', () => {
        const channelId = 'testChannelId';
        const testApprovedHosts = {
          [AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId]: {},
        } as ApprovedHosts;
        sdkConnect.state.approvedHosts = testApprovedHosts;

        expect(sdkConnect.isApproved({ channelId })).toEqual(true);
      });
    });

    describe('hasInitialized', () => {
      it('should check if SDKConnect has initialized', () => {
        sdkConnect.state._initialized = true;

        expect(sdkConnect.hasInitialized()).toEqual(true);
      });
    });

    describe('getSessionsStorage', () => {
      it('should get sessions storage', () => {
        const testSessionsStorage = {} as SDKSessions;
        sdkConnect.state.connections = testSessionsStorage;

        expect(sdkConnect.getSessionsStorage()).toEqual(testSessionsStorage);
      });
    });
  });
});
