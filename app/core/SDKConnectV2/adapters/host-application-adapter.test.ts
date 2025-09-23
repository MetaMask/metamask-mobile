import { HostApplicationAdapter } from './host-application-adapter';
import { ConnectionInfo } from '../types/connection-info';
import { Connection } from '../services/connection';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import {
  getPermittedAccounts,
  removePermittedAccounts,
} from '../../../core/Permissions';
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

const createMockConnectionInfo = (
  id: string,
  name: string,
): ConnectionInfo => ({
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
});

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
      adapter.showConnectionLoading(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

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
      adapter.hideConnectionLoading(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

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
      const mockConnectionInfo = createMockConnectionInfo('conn1', 'Test');
      const connections = [
        { id: mockConnectionInfo.id, info: mockConnectionInfo },
      ] as unknown as Connection[];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnectionInfo.id]: {
          id: mockConnectionInfo.id,
          otherPublicKey: '',
          origin: mockConnectionInfo.metadata.dapp.url,
          originatorInfo: {
            title: mockConnectionInfo.metadata.dapp.name,
            url: mockConnectionInfo.metadata.dapp.url,
            icon: mockConnectionInfo.metadata.dapp.icon,
            dappId: mockConnectionInfo.metadata.dapp.name,
            apiVersion: mockConnectionInfo.metadata.sdk.version,
            platform: mockConnectionInfo.metadata.sdk.platform,
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
      const mockConnectionInfo1 = createMockConnectionInfo('conn1', 'Test1');
      const mockConnectionInfo2 = createMockConnectionInfo('conn2', 'Test2');
      const connections = [
        { id: mockConnectionInfo1.id, info: mockConnectionInfo1 },
        { id: mockConnectionInfo2.id, info: mockConnectionInfo2 },
      ] as unknown as Connection[];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnectionInfo1.id]: {
          id: mockConnectionInfo1.id,
          otherPublicKey: '',
          origin: mockConnectionInfo1.metadata.dapp.url,
          originatorInfo: {
            title: mockConnectionInfo1.metadata.dapp.name,
            url: mockConnectionInfo1.metadata.dapp.url,
            icon: mockConnectionInfo1.metadata.dapp.icon,
            dappId: mockConnectionInfo1.metadata.dapp.name,
            apiVersion: mockConnectionInfo1.metadata.sdk.version,
            platform: mockConnectionInfo1.metadata.sdk.platform,
          },
          isV2: true,
        },
        [mockConnectionInfo2.id]: {
          id: mockConnectionInfo2.id,
          otherPublicKey: '',
          origin: mockConnectionInfo2.metadata.dapp.url,
          originatorInfo: {
            title: mockConnectionInfo2.metadata.dapp.name,
            url: mockConnectionInfo2.metadata.dapp.url,
            icon: mockConnectionInfo2.metadata.dapp.icon,
            dappId: mockConnectionInfo2.metadata.dapp.name,
            apiVersion: mockConnectionInfo2.metadata.sdk.version,
            platform: mockConnectionInfo2.metadata.sdk.platform,
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
