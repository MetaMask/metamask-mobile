import { HostApplicationAdapter } from './host-application-adapter';
import { Connection } from '../services/connection';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import {
  getPermittedAccounts,
  removePermittedAccounts,
} from '../../../core/Permissions';
import { ConnectionRequest } from '../types/connection-request';
import {
  hideNotificationById,
  showSimpleNotification,
} from '../../../actions/notification';

jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

jest.mock('../../../actions/sdk', () => ({
  setSdkV2Connections: jest.fn((connections) => ({
    type: 'SET_SDK_V2_CONNECTIONS',
    connections,
  })),
}));

jest.mock('../../../core/Permissions', () => ({
  getPermittedAccounts: jest.fn(),
  removePermittedAccounts: jest.fn(),
}));

jest.mock('../../../actions/notification', () => ({
  showSimpleNotification: jest.fn((notification) => ({
    type: 'SHOW_SIMPLE_NOTIFICATION',
    notification,
  })),
  hideNotificationById: jest.fn((id) => ({
    type: 'HIDE_NOTIFICATION_BY_ID',
    id,
  })),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => key),
}));

const createMockConnection = (id: string, name: string): Connection =>
  ({
    id,
    metadata: {
      dapp: {
        name: `${name} DApp`,
        url: `https://testdapp${id}.com`,
        icon: `https://testdapp${id}.com/icon.png`,
      },
      sdk: {
        version: '2.1.0',
        platform: 'JavaScript',
      },
    },
  } as Connection);

const mockConnectionRequest: ConnectionRequest = {
  sessionRequest: {
    id: 'session-123',
    publicKeyB64: 'test-key',
    channel: 'test-channel',
    mode: 'trusted',
    expiresAt: Date.now() + 3600000,
  },
  metadata: {
    dapp: {
      name: 'Test DApp',
      url: 'https://test.com',
      icon: 'https://test.com/icon.png',
    },
    sdk: {
      version: '1.0.0',
      platform: 'web',
    },
  },
};

describe('HostApplicationAdapter', () => {
  let adapter: HostApplicationAdapter;

  beforeEach(() => {
    (store.dispatch as jest.Mock).mockClear();
    (setSdkV2Connections as jest.Mock).mockClear();
    (getPermittedAccounts as jest.Mock).mockClear();
    (removePermittedAccounts as jest.Mock).mockClear();
    (showSimpleNotification as jest.Mock).mockClear();
    (hideNotificationById as jest.Mock).mockClear();
    adapter = new HostApplicationAdapter();
  });

  describe('showConnectionLoading', () => {
    it('dispatches a pending notification with connection details', () => {
      adapter.showConnectionLoading(mockConnectionRequest);

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 8000,
        title: 'sdk_connect_v2.show_loading.title',
        description: 'sdk_connect_v2.show_loading.description',
        status: 'pending',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('hideConnectionLoading', () => {
    it('dispatches hideNotificationById with the session request ID', () => {
      adapter.hideConnectionLoading(mockConnectionRequest);

      expect(hideNotificationById).toHaveBeenCalledTimes(1);
      expect(hideNotificationById).toHaveBeenCalledWith('session-123');
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showConnectionError', () => {
    it('dispatches an error notification with standard error message', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      adapter.showConnectionError();

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: '1234567890',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_error.title',
        description: 'sdk_connect_v2.show_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncConnectionList', () => {
    it('should correctly transform a single Connection object and dispatch it to the Redux store', () => {
      const mockConnection = createMockConnection('conn1', 'Test');
      const connections: Connection[] = [mockConnection];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnection.id]: {
          id: mockConnection.id,
          otherPublicKey: '',
          origin: mockConnection.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection.metadata.dapp.name,
            url: mockConnection.metadata.dapp.url,
            icon: mockConnection.metadata.dapp.icon,
            dappId: mockConnection.metadata.dapp.name,
            apiVersion: mockConnection.metadata.sdk.version,
            platform: mockConnection.metadata.sdk.platform,
          },
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
      expect(store.dispatch).toHaveBeenCalledWith(
        setSdkV2Connections(expectedSessions),
      );
    });

    it('should handle an empty array by dispatching an empty object', () => {
      const connections: Connection[] = [];

      adapter.syncConnectionList(connections);

      const expectedSessions = {} as SDKSessions;
      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
      expect(store.dispatch).toHaveBeenCalledWith(
        setSdkV2Connections(expectedSessions),
      );
    });

    it('should correctly transform an array of multiple Connection objects', () => {
      const mockConnection1 = createMockConnection('conn1', 'Test1');
      const mockConnection2 = createMockConnection('conn2', 'Test2');
      const connections: Connection[] = [mockConnection1, mockConnection2];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnection1.id]: {
          id: mockConnection1.id,
          otherPublicKey: '',
          origin: mockConnection1.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection1.metadata.dapp.name,
            url: mockConnection1.metadata.dapp.url,
            icon: mockConnection1.metadata.dapp.icon,
            dappId: mockConnection1.metadata.dapp.name,
            apiVersion: mockConnection1.metadata.sdk.version,
            platform: mockConnection1.metadata.sdk.platform,
          },
          isV2: true,
        },
        [mockConnection2.id]: {
          id: mockConnection2.id,
          otherPublicKey: '',
          origin: mockConnection2.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection2.metadata.dapp.name,
            url: mockConnection2.metadata.dapp.url,
            icon: mockConnection2.metadata.dapp.icon,
            dappId: mockConnection2.metadata.dapp.name,
            apiVersion: mockConnection2.metadata.sdk.version,
            platform: mockConnection2.metadata.sdk.platform,
          },
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
    });
  });

  describe('revokePermissions', () => {
    it('should call removePermittedAccounts when there are permitted accounts', () => {
      const connectionId = 'test-connection-id';
      const mockAccounts = ['0x123...', '0x456...'];
      (getPermittedAccounts as jest.Mock).mockReturnValue(mockAccounts);

      adapter.revokePermissions(connectionId);

      expect(getPermittedAccounts).toHaveBeenCalledWith(connectionId);
      expect(removePermittedAccounts).toHaveBeenCalledWith(
        connectionId,
        mockAccounts,
      );
    });

    it('should not call removePermittedAccounts when there are no permitted accounts', () => {
      const connectionId = 'test-connection-id';
      (getPermittedAccounts as jest.Mock).mockReturnValue([]);

      adapter.revokePermissions(connectionId);

      expect(getPermittedAccounts).toHaveBeenCalledWith(connectionId);
      expect(removePermittedAccounts).not.toHaveBeenCalled();
    });

    it('should handle single permitted account correctly', () => {
      const connectionId = 'test-connection-id';
      const mockAccount = ['0x123...'];
      (getPermittedAccounts as jest.Mock).mockReturnValue(mockAccount);

      adapter.revokePermissions(connectionId);

      expect(getPermittedAccounts).toHaveBeenCalledWith(connectionId);
      expect(removePermittedAccounts).toHaveBeenCalledWith(
        connectionId,
        mockAccount,
      );
    });

    it('should handle multiple permitted accounts correctly', () => {
      const connectionId = 'test-connection-id';
      const mockAccounts = ['0x123...', '0x456...', '0x789...'];
      (getPermittedAccounts as jest.Mock).mockReturnValue(mockAccounts);

      adapter.revokePermissions(connectionId);

      expect(getPermittedAccounts).toHaveBeenCalledWith(connectionId);
      expect(removePermittedAccounts).toHaveBeenCalledWith(
        connectionId,
        mockAccounts,
      );
    });
  });
});
