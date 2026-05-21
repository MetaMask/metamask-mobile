import { HostApplicationAdapter } from './host-application-adapter';
import { ConnectionInfo } from '../types/connection-info';
import { Connection } from '../services/connection';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import {
  hideNotificationById,
  showSimpleNotification,
} from '../../../actions/notification';
import Engine from '../../Engine';
import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { AgenticCliDashboardWebviewService } from '../../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';
import { devApiEnv } from '../../devApiEnv';

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

jest.mock(
  '../../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService',
  () => ({
    AgenticCliDashboardWebviewService: {
      open: jest.fn(),
    },
  }),
);

jest.mock('../../devApiEnv', () => ({
  devApiEnv: jest.fn(() => 'dev'),
}));

jest.mock('../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      getCurrentRoute: jest.fn(() => ({ name: 'SDKConnectV2Otp' })),
    },
  },
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
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
});

describe('HostApplicationAdapter', () => {
  let adapter: HostApplicationAdapter;
  const devApiEnvMock = devApiEnv as jest.MockedFunction<typeof devApiEnv>;
  const revokePermission = Engine.context.PermissionController
    .revokePermission as jest.Mock;

  beforeEach(() => {
    devApiEnvMock.mockReturnValue('dev');
    (store.dispatch as jest.Mock).mockClear();
    (setSdkV2Connections as jest.Mock).mockClear();
    (showSimpleNotification as jest.Mock).mockClear();
    (hideNotificationById as jest.Mock).mockClear();
    (revokePermission as jest.Mock).mockClear();
    (AgenticCliDashboardWebviewService.open as jest.Mock).mockReset();
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
        autodismiss: 15000,
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

    it('dispatches an error notification when request is rejected or fails', () => {
      adapter.showConnectionError(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_error.title',
        description: 'sdk_connect_v2.show_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showInternalError', () => {
    it('dispatches an error notification with internal error message', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      adapter.showInternalError();

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: '1234567890',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_internal_error.title',
        description: 'sdk_connect_v2.show_internal_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('dispatches an internal error notification with connection info', () => {
      adapter.showInternalError(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_internal_error.title',
        description: 'sdk_connect_v2.show_internal_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showMethodError', () => {
    it('dispatches an error notification with method error message', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      adapter.showMethodError();

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: '1234567890',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_method_error.title',
        description: 'sdk_connect_v2.show_method_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('dispatches a method error notification with connection info', () => {
      adapter.showMethodError(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_method_error.title',
        description: 'sdk_connect_v2.show_method_error.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showConfirmationRejectionError', () => {
    it('dispatches a rejection error notification with connection info', () => {
      adapter.showConfirmationRejectionError(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_rejection.title',
        description: 'sdk_connect_v2.show_rejection.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('dispatches a rejection error notification without connection info', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      adapter.showConfirmationRejectionError();

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: '1234567890',
        autodismiss: 5000,
        title: 'sdk_connect_v2.show_rejection.title',
        description: 'sdk_connect_v2.show_rejection.description',
        status: 'error',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showReturnToApp', () => {
    it('dispatches a success notification prompting user to return to app', () => {
      adapter.showReturnToApp(
        createMockConnectionInfo('session-123', 'Test DApp'),
      );

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123',
        autodismiss: 3000,
        title: 'sdk_connect_v2.show_return_to_app.title',
        description: 'sdk_connect_v2.show_return_to_app.description',
        status: 'success',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('showOtpCode', () => {
    it('navigates to the OTP bottom sheet with otp, dappName and deadline params', () => {
      const navigateSpy = NavigationService.navigation.navigate as jest.Mock;
      navigateSpy.mockClear();

      const connInfo = createMockConnectionInfo('session-123', 'Agentic CLI');
      const deadline = Date.now() + 60_000;

      adapter.showOtpCode(connInfo, '4892AKJ7', deadline);

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_CONNECT_V2_OTP,
        params: {
          otp: '4892AKJ7',
          dappName: connInfo.metadata.dapp.name,
          deadline,
        },
      });
    });
  });

  describe('showCliLinkSuccess', () => {
    it('dispatches a success notification with the CLI link confirmation copy', () => {
      const connInfo = createMockConnectionInfo('session-123', 'Agentic CLI');

      adapter.showCliLinkSuccess(connInfo);

      expect(showSimpleNotification).toHaveBeenCalledTimes(1);
      expect(showSimpleNotification).toHaveBeenCalledWith({
        id: 'session-123-cli-link-success',
        autodismiss: 3000,
        title: 'sdk_connect_v2.show_cli_link_success.title',
        description: 'sdk_connect_v2.show_cli_link_success.description',
        status: 'success',
      });
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('hideOtpCode', () => {
    let goBackSpy: jest.Mock;
    let getCurrentRouteSpy: jest.Mock;
    let canGoBackSpy: jest.Mock;

    beforeEach(() => {
      goBackSpy = NavigationService.navigation.goBack as jest.Mock;
      getCurrentRouteSpy = NavigationService.navigation
        .getCurrentRoute as jest.Mock;
      canGoBackSpy = NavigationService.navigation.canGoBack as jest.Mock;
      goBackSpy.mockClear();
      getCurrentRouteSpy.mockClear();
      canGoBackSpy.mockClear();
    });

    it('pops the OTP route when it is the current screen', () => {
      getCurrentRouteSpy.mockReturnValue({
        name: Routes.SHEET.SDK_CONNECT_V2_OTP,
      });
      canGoBackSpy.mockReturnValue(true);

      adapter.hideOtpCode(
        createMockConnectionInfo('session-123', 'Agentic CLI'),
      );

      expect(goBackSpy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the current route is not the OTP modal', () => {
      getCurrentRouteSpy.mockReturnValue({ name: 'SomeOtherScreen' });
      canGoBackSpy.mockReturnValue(true);

      adapter.hideOtpCode(
        createMockConnectionInfo('session-123', 'Agentic CLI'),
      );

      expect(goBackSpy).not.toHaveBeenCalled();
    });

    it('does nothing when there is nothing to go back to', () => {
      getCurrentRouteSpy.mockReturnValue({
        name: Routes.SHEET.SDK_CONNECT_V2_OTP,
      });
      canGoBackSpy.mockReturnValue(false);

      adapter.hideOtpCode(
        createMockConnectionInfo('session-123', 'Agentic CLI'),
      );

      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });

  describe('requestCliAuthToken', () => {
    it('opens the dev dashboard webview when dev API env is enabled', async () => {
      (AgenticCliDashboardWebviewService.open as jest.Mock).mockResolvedValue(
        'cli-token',
      );
      await expect(
        adapter.requestCliAuthToken(
          'mobile-auth-token',
          'https://dashboard.w3a.io',
        ),
      ).resolves.toBe('cli-token');

      expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
        dashboardUrl: 'https://test-dashboard.web3auth.io/agentic/login',
        dashboardToken: 'mobile-auth-token',
      });
    });

    it('opens the production dashboard webview by default', async () => {
      devApiEnvMock.mockReturnValue('prod');
      (AgenticCliDashboardWebviewService.open as jest.Mock).mockResolvedValue(
        'cli-token',
      );

      await expect(
        adapter.requestCliAuthToken(
          'mobile-auth-token',
          'https://test-dashboard.web3auth.io',
        ),
      ).resolves.toBe('cli-token');

      expect(AgenticCliDashboardWebviewService.open).toHaveBeenCalledWith({
        dashboardUrl: 'https://dashboard.w3a.io/agentic/login',
        dashboardToken: 'mobile-auth-token',
      });
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
            anonId: undefined,
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
            anonId: undefined,
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
            anonId: undefined,
          },
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
    });

    it('includes anonId in originatorInfo when analytics.remote_session_id is present', () => {
      const connInfoWithAnon: ConnectionInfo = {
        ...createMockConnectionInfo('conn-anon', 'AnonTest'),
        metadata: {
          ...createMockConnectionInfo('conn-anon', 'AnonTest').metadata,
          analytics: {
            remote_session_id: 'aabbccdd-1122-3344-5566-778899aabbcc',
          },
        },
      };
      const connections = [
        { id: connInfoWithAnon.id, info: connInfoWithAnon },
      ] as unknown as Connection[];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [connInfoWithAnon.id]: {
          id: connInfoWithAnon.id,
          otherPublicKey: '',
          origin: connInfoWithAnon.metadata.dapp.url,
          originatorInfo: {
            title: connInfoWithAnon.metadata.dapp.name,
            url: connInfoWithAnon.metadata.dapp.url,
            icon: connInfoWithAnon.metadata.dapp.icon,
            dappId: connInfoWithAnon.metadata.dapp.name,
            apiVersion: connInfoWithAnon.metadata.sdk.version,
            platform: connInfoWithAnon.metadata.sdk.platform,
            anonId: 'aabbccdd-1122-3344-5566-778899aabbcc',
          },
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
    });
  });

  describe('revokePermissions', () => {
    it('should call removePermittedAccounts when there are permitted accounts', () => {
      const connectionId = 'test-connection-id';
      adapter.revokePermissions(connectionId);

      expect(revokePermission).toHaveBeenCalledWith(
        connectionId,
        Caip25EndowmentPermissionName,
      );
    });

    it('should gracefully handle exception if no permission exists', () => {
      const connectionId = 'test-connection-id';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      revokePermission.mockImplementation(() => {
        throw new Error('Permission not found');
      });

      expect(() => adapter.revokePermissions(connectionId)).not.toThrow();

      expect(revokePermission).toHaveBeenCalledWith(
        connectionId,
        Caip25EndowmentPermissionName,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SDKConnectV2]',
        `Failed to revoke ${Caip25EndowmentPermissionName} permission for connection`,
        connectionId,
      );
    });

    it('should handle single permitted account correctly', () => {
      const connectionId = 'test-connection-id';
      adapter.revokePermissions(connectionId);

      expect(revokePermission).toHaveBeenCalledWith(
        connectionId,
        Caip25EndowmentPermissionName,
      );
    });

    it('should handle multiple permitted accounts correctly', () => {
      const connectionId = 'test-connection-id';
      adapter.revokePermissions(connectionId);

      expect(revokePermission).toHaveBeenCalledWith(
        connectionId,
        Caip25EndowmentPermissionName,
      );
    });
  });
});
