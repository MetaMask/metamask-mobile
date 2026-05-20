import { Connection } from '../services/connection';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { ConnectionProps } from '../../../core/SDKConnect/Connection';
import {
  hideNotificationById,
  showSimpleNotification,
} from '../../../actions/notification';
import { strings } from '../../../../locales/i18n';
import { ConnectionInfo } from '../types/connection-info';
import Engine from '../../Engine';
import { Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import logger, { redactUrl } from '../services/logger';
import { AgenticCliDashboardWebviewService } from '../../../components/Views/AgenticCliDashboardWebview/AgenticCliDashboardWebviewService';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';

const DASHBOARD_WEBVIEW_URLS = {
  DEV_TOKEN: 'https://test-dashboard.web3auth.io/agentic/auth',
  PROD_TOKEN: 'https://dev-dashboard.web3auth.io/agentic/auth',
} as const;
const DEFAULT_DASHBOARD_WEBVIEW_URL = DASHBOARD_WEBVIEW_URLS.DEV_TOKEN;

export class HostApplicationAdapter implements IHostApplicationAdapter {
  showConnectionLoading(conninfo: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo.id,
        autodismiss: 10000,
        title: strings('sdk_connect_v2.show_loading.title'),
        description: strings('sdk_connect_v2.show_loading.description', {
          dappName: conninfo.metadata.dapp.name,
        }),
        status: 'pending',
      }),
    );
  }

  hideConnectionLoading(conninfo: ConnectionInfo): void {
    store.dispatch(hideNotificationById(conninfo.id));
  }

  showConnectionError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_error.title'),
        description: strings('sdk_connect_v2.show_error.description'),
        status: 'error',
      }),
    );
  }

  showInternalError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_internal_error.title'),
        description: strings('sdk_connect_v2.show_internal_error.description'),
        status: 'error',
      }),
    );
  }

  showMethodError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_method_error.title'),
        description: strings('sdk_connect_v2.show_method_error.description'),
        status: 'error',
      }),
    );
  }

  showConfirmationRejectionError(conninfo?: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo?.id || Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_rejection.title'),
        description: strings('sdk_connect_v2.show_rejection.description'),
        status: 'error',
      }),
    );
  }

  showReturnToApp(conninfo: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: conninfo.id,
        autodismiss: 3000,
        title: strings('sdk_connect_v2.show_return_to_app.title'),
        description: strings('sdk_connect_v2.show_return_to_app.description'),
        status: 'success',
      }),
    );
  }

  showOtpCode(conninfo: ConnectionInfo, otp: string, deadline: number): void {
    logger.debug('Showing OTP modal', {
      connectionId: conninfo.id,
      deadline,
    });

    NavigationService.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_CONNECT_V2_OTP,
      params: {
        otp,
        dappName: conninfo.metadata.dapp.name,
        deadline,
      },
    });
  }

  hideOtpCode(conninfo: ConnectionInfo): void {
    const nav = NavigationService.navigation;
    const currentRoute = nav?.getCurrentRoute()?.name;

    if (currentRoute === Routes.SHEET.SDK_CONNECT_V2_OTP && nav?.canGoBack()) {
      logger.debug('Hiding OTP modal', { connectionId: conninfo.id });
      nav.goBack();
    } else {
      logger.debug('Hiding OTP modal skipped (not on OTP route)', {
        connectionId: conninfo.id,
        currentRoute,
      });
    }
  }

  showCliLinkSuccess(conninfo: ConnectionInfo): void {
    store.dispatch(
      showSimpleNotification({
        id: `${conninfo.id}-cli-link-success`,
        autodismiss: 3000,
        title: strings('sdk_connect_v2.show_cli_link_success.title'),
        status: 'success',
        description: null,
      }),
    );
  }

  async requestCliAuthToken(
    dashboardAccessToken: string,
    dashboardUrl?: string,
  ): Promise<string> {
    if (dashboardUrl && dashboardUrl !== DEFAULT_DASHBOARD_WEBVIEW_URL) {
      logger.debug('Ignoring QR-provided Agentic CLI dashboard URL', {
        dashboardUrl: redactUrl(dashboardUrl),
        configuredDashboardUrl: DEFAULT_DASHBOARD_WEBVIEW_URL,
      });
    }

    return AgenticCliDashboardWebviewService.open({
      dashboardUrl: DEFAULT_DASHBOARD_WEBVIEW_URL,
      dashboardToken: dashboardAccessToken,
    });
  }

  showNotFoundError(): void {
    store.dispatch(
      showSimpleNotification({
        id: Date.now().toString(),
        autodismiss: 5000,
        title: strings('sdk_connect_v2.show_not_found.title'),
        description: strings('sdk_connect_v2.show_not_found.description'),
        status: 'error',
      }),
    );
  }

  syncConnectionList(conns: Connection[]): void {
    const v2Sessions: SDKSessions = conns.reduce((acc, conn) => {
      const props: ConnectionProps & { isV2: boolean } = {
        id: conn.id,
        otherPublicKey: '',
        origin: conn.info.metadata.dapp.url,
        originatorInfo: {
          title: conn.info.metadata.dapp.name,
          url: conn.info.metadata.dapp.url,
          icon: conn.info.metadata.dapp.icon,
          dappId: conn.info.metadata.dapp.name,
          apiVersion: conn.info.metadata.sdk.version,
          platform: conn.info.metadata.sdk.platform,
          anonId: conn.info.metadata.analytics?.remote_session_id,
        },
        isV2: true, // Flag to identify this as a V2 connection
      };
      acc[conn.id] = props;
      return acc;
    }, {} as SDKSessions);

    store.dispatch(setSdkV2Connections(v2Sessions));
  }

  /**
   * Revokes {@link Caip25EndowmentPermissionName} permission from a connection / origin.
   * @param connId - The origin of the connection.
   */
  revokePermissions(connId: string): void {
    try {
      Engine.context.PermissionController.revokePermission(
        connId,
        Caip25EndowmentPermissionName,
      );
    } catch {
      logger.error(
        `Failed to revoke ${Caip25EndowmentPermissionName} permission for connection`,
        connId,
      );
    }
  }
}
